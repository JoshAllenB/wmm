import { io } from "socket.io-client";

class WebSocketService {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isConnecting = false;
    this.connectionQueue = [];
    this.connectionEstablished = false;
    this.pendingDataSync = false;
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.connectionTimeout = null;
    this.directEventHandlers = new Map();

    this.sessionData = {
      userId: null,
      username: null,
      sessionId: null,
      socketId: null,
    };

    // Restore session data from localStorage if available
    this.restoreSession();

    // Add debug flag
    this.debug = true;
  }

  restoreSession() {
    const sessionId = localStorage.getItem("sessionId");
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");

    if (sessionId && userId && username) {
      this.sessionData = {
        sessionId,
        userId,
        username,
        socketId: null,
      };
    }
  }

  on(event, handler) {
    if (!this.directEventHandlers.has(event)) {
      this.directEventHandlers.set(event, new Set());
    }
    this.directEventHandlers.get(event).add(handler);

    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  off(event, handler) {
    const handlers = this.directEventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (this.socket) {
        this.socket.off(event, handler);
      }
    }
  }

  connect(options = {}) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.isConnecting) {
      this.connectionQueue.push(options);
      return;
    }

    if (!options.query || !options.query.userId || !options.query.username) {
      if (this.sessionData.userId && this.sessionData.username && this.sessionData.sessionId) {
        options.query = { ...this.sessionData };
      } else {
        console.warn("[WebSocket] Cannot connect without valid user data");
        return;
      }
    }

    this.isConnecting = true;

    const sessionId = 
      options.query?.sessionId || 
      this.sessionData.sessionId ||
      localStorage.getItem("sessionId");
    
    const userId = options.query?.userId || this.sessionData.userId;
    const username = options.query?.username || this.sessionData.username;

    if (!sessionId || !userId || !username || userId === "null" || username === "null" || sessionId === "null") {
      console.warn("[WebSocket] Cannot connect without valid user data");
      this.isConnecting = false;
      return;
    }

    this.sessionData = {
      ...this.sessionData,
      sessionId,
      userId,
      username,
    };

    localStorage.setItem("sessionId", sessionId);
    localStorage.setItem("userId", userId);
    localStorage.setItem("username", username);

    if (this.socket) {
      if (this.socket.connected) {
        this.isConnecting = false;
        return;
      }
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(this.url, {
      query: this.sessionData,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      autoConnect: true,
      forceNew: true, // Force new connection to prevent duplicate connections
      timeout: 20000,
      pingTimeout: 30000,
      pingInterval: 25000,
    });

    // Setup ping interval to keep connection alive
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 25000);

    // Set a connection timeout
    this.connectionTimeout = setTimeout(() => {
      if (!this.connectionEstablished) {
        console.warn("[WebSocket] Connection timeout, attempting reconnect...");
        this.reconnect();
      }
    }, 10000);

    // Reattach direct event handlers
    this.directEventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.socket.on(event, handler);
      });
    });

    this.socket.on("connect", () => {
      this.reconnectAttempts = 0;
      this.sessionData.socketId = this.socket.id;
      this.isConnecting = false;
      this.connectionEstablished = true;
      
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      console.log("[WebSocket] Connected successfully:", {
        socketId: this.socket.id,
        userId: this.sessionData.userId,
        username: this.sessionData.username
      });
      
      // Request data sync after connection
      this.requestDataSync();
      
      if (this.connectionQueue.length > 0) {
        const nextOptions = this.connectionQueue.shift();
        this.connect(nextOptions);
      }

      this.resubscribeEvents();
    });

    this.socket.on("disconnect", (reason) => {
      this.connectionEstablished = false;
      
      // Clear ping interval on disconnect
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      console.log("[WebSocket] Disconnected:", {
        reason,
        socketId: this.socket?.id,
        userId: this.sessionData.userId
      });

      if (reason === "io server disconnect" || reason === "client namespace disconnect") {
        // Set a timer to reconnect
        this.reconnectTimer = setTimeout(() => {
          this.reconnect();
        }, 2000);
      }
      this.isConnecting = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("[WebSocket] Max reconnection attempts reached");
        // Clear session data if we can't reconnect
        this.clearSession();
      }
      
      this.isConnecting = false;
    });

    this.socket.on("session-transferred", () => {
      console.log("[WebSocket] Session transferred to another connection");
      this.socket.disconnect();
    });

    this.socket.on("pong", () => {
      // Reset reconnect attempts on successful pong
      this.reconnectAttempts = 0;
    });

    // Add data sync event handlers
    this.socket.on("data-sync-start", () => {
      this.pendingDataSync = true;
      console.log("[WebSocket] Data sync started");
    });

    this.socket.on("data-sync-complete", () => {
      this.pendingDataSync = false;
      console.log("[WebSocket] Data sync completed");
      // Notify all data-update subscribers to refresh their data
      const handlers = this.eventHandlers.get("data-update") || new Set();
      handlers.forEach(handler => {
        handler({ type: "sync-complete" });
      });
    });

    this.socket.on("data-sync-error", (error) => {
      console.error("[WebSocket] Data sync error:", error);
      this.pendingDataSync = false;
    });

    // Add data update handler
    this.socket.on("data-update", (data) => {
      // Ensure subscription data arrays are always present
      if (data.type === "update" || data.type === "add") {
        data.data = {
          ...data.data,
          wmmData: data.data.wmmData || [],
          hrgData: data.data.hrgData || [],
          fomData: data.data.fomData || [],
          calData: data.data.calData || [],
          services: data.data.services || []
        };
      }

      // Notify all subscribers
      const handlers = this.eventHandlers.get("data-update") || new Set();
      handlers.forEach(handler => handler(data));
    });
  }

  clearSession() {
    localStorage.removeItem("sessionId");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    this.sessionData = {
      userId: null,
      username: null,
      sessionId: null,
      socketId: null,
    };
  }

  reconnect() {
    // Only try to reconnect if we have valid session data
    if (this.sessionData.userId && this.sessionData.username && this.sessionData.sessionId) {
      console.log("[WebSocket] Attempting reconnection...");
      this.connect({ query: this.sessionData });
    } else {
      console.warn("[WebSocket] Cannot reconnect: No valid session data");
    }
  }

  subscribe(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    // Wrap the handler with debug logging
    const wrappedHandler = (data) => {
      if (this.debug) {
        console.log(`[WebSocket] Event ${event} received:`, {
          type: data?.type,
          timestamp: data?.timestamp,
          dataId: data?.data?.id || 'none'
        });
      }
      handler(data);
    };
    
    this.eventHandlers.get(event).add(wrappedHandler);

    if (!this.socket || !this.socket.connected) {
      console.warn("[WebSocket] Socket not initialized or not connected, connecting...");
      if (this.sessionData.userId && this.sessionData.username) {
        this.connect({ query: this.sessionData });
      } else {
        console.warn("[WebSocket] Cannot subscribe: No valid user data available for connection");
      }
    } else if (this.socket) {
      this.socket.on(event, wrappedHandler);
    }

    // Return unsubscribe function
    return () => this.unsubscribe(event, wrappedHandler);
  }

  unsubscribe(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (this.socket) {
        this.socket.off(event, handler);
      }
    }
  }

  resubscribeEvents() {
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        if (this.socket) {
          this.socket.on(event, handler);
        }
      });
    });
  }

  requestDataSync() {
    if (!this.pendingDataSync && this.socket?.connected) {
      this.socket.emit("request-data-sync", {
        timestamp: Date.now()
      });
    }
  }

  emit(event, data) {
    if (!this.socket || !this.socket.connected) {
      console.warn("[WebSocket] Socket not connected, attempting to connect first...");
      if (this.sessionData.userId && this.sessionData.username) {
        this.connect({ query: this.sessionData });
        this.socket.once('connect', () => {
          this.socket.emit(event, data);
        });
        return;
      } else {
        console.warn("[WebSocket] Cannot emit: No valid user data available for connection");
        return;
      }
    }
    
    this.socket.emit(event, data);
  }

  disconnect() {
    if (this.socket) {
      // Clear all intervals and timers
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
      this.connectionEstablished = false;
      this.reconnectAttempts = 0;
    }
  }
}

const webSocketService = new WebSocketService(
  `http://${import.meta.env.VITE_IP_ADDRESS}:3001`
);

export { webSocketService };

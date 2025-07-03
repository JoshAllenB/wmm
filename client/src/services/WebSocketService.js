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
        ...this.sessionData,
        sessionId,
        userId,
        username,
      };
    }
  }

  connect(options = {}) {
    console.log("[WebSocket] Connecting with options:", options);

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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
      forceNew: false,
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

    this.socket.on("connect", () => {
      console.log("[WebSocket] Connected successfully");
      this.reconnectAttempts = 0;
      this.sessionData.socketId = this.socket.id;
      this.isConnecting = false;
      this.connectionEstablished = true;
      
      // Request data sync after connection
      this.requestDataSync();
      
      if (this.connectionQueue.length > 0) {
        const nextOptions = this.connectionQueue.shift();
        this.connect(nextOptions);
      }

      this.resubscribeEvents();
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[WebSocket] Disconnected:", reason);
      this.connectionEstablished = false;
      
      // Clear ping interval on disconnect
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      if (reason === "io server disconnect" || reason === "client namespace disconnect") {
        // Set a timer to reconnect
        this.reconnectTimer = setTimeout(() => {
          console.log("[WebSocket] Attempting reconnection...");
          this.reconnect();
        }, 2000);
      }
      this.isConnecting = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("[WebSocket] Max reconnection attempts reached");
      }
      this.isConnecting = false;
    });

    this.socket.on("pong", () => {
      if (this.debug) {
        console.log("[WebSocket] Received pong from server");
      }
    });

    // Add data sync event handlers
    this.socket.on("data-sync-start", () => {
      console.log("[WebSocket] Data sync started");
      this.pendingDataSync = true;
    });

    this.socket.on("data-sync-complete", () => {
      console.log("[WebSocket] Data sync completed");
      this.pendingDataSync = false;
      // Notify all data-update subscribers to refresh their data
      const handlers = this.eventHandlers.get("data-update") || new Set();
      handlers.forEach(handler => {
        handler({ type: "sync-complete" });
      });
    });

    // Add data update handler
    this.socket.on("data-update", (data) => {
      if (this.debug) {
        console.log("[WebSocket] Received data update:", {
          type: data.type,
          timestamp: new Date().toISOString(),
          hasData: data?.data != null,
          subscriptionData: {
            wmmData: Array.isArray(data?.data?.wmmData),
            hrgData: Array.isArray(data?.data?.hrgData),
            fomData: Array.isArray(data?.data?.fomData),
            calData: Array.isArray(data?.data?.calData)
          }
        });
      }

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

  requestDataSync() {
    if (!this.socket?.connected || this.pendingDataSync) return;
    
    console.log("[WebSocket] Requesting data sync");
    this.socket.emit("request-data-sync", {
      userId: this.sessionData.userId,
      timestamp: Date.now()
    });
  }

  resubscribeEvents() {
    // Resubscribe to all events after reconnection
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        if (this.socket) {
          this.socket.on(event, handler);
        }
      });
    });
  }

  reconnect() {
    console.log("Attempting to reconnect...");
    // Only try to reconnect if we have valid session data
    if (this.sessionData.userId && this.sessionData.username && this.sessionData.sessionId) {
      this.connect({ query: this.sessionData });
    }
  }

  subscribe(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    // Wrap the handler with debug logging
    const wrappedHandler = (data) => {
      if (this.debug) {
        console.log(`[WebSocket] Received ${event}:`, {
          timestamp: new Date().toISOString(),
          sourceUser: data?.sourceUserId,
          currentUser: this.sessionData.userId,
          dataType: Array.isArray(data) ? 'array' : typeof data,
          hasData: data != null
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

  emit(event, data) {
    if (!this.socket || !this.socket.connected) {
      console.warn("[WebSocket] Socket not connected, attempting to connect first...");
      if (this.sessionData.userId && this.sessionData.username) {
        this.connect({ query: this.sessionData });
        this.socket.once('connect', () => {
          if (this.debug) {
            console.log(`[WebSocket] Emitting delayed ${event}:`, {
              timestamp: new Date().toISOString(),
              userId: this.sessionData.userId,
              dataType: Array.isArray(data) ? 'array' : typeof data
            });
          }
          this.socket.emit(event, data);
        });
        return;
      } else {
        console.warn("[WebSocket] Cannot emit: No valid user data available for connection");
        return;
      }
    }
    
    if (this.debug) {
      console.log(`[WebSocket] Emitting ${event}:`, {
        timestamp: new Date().toISOString(),
        userId: this.sessionData.userId,
        dataType: Array.isArray(data) ? 'array' : typeof data
      });
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

      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
      this.connectionEstablished = false;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const webSocketService = new WebSocketService(
  `http://${import.meta.env.VITE_IP_ADDRESS}:3001`
);

// Don't auto-connect anymore - let the SocketProvider handle this
// based on user authentication state

export { webSocketService };

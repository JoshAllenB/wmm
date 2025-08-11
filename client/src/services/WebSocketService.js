import { io } from "socket.io-client";
import errorHandler from './errorHandler';

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
        // Use centralized error handler for max reconnection attempts
        errorHandler.handleWebSocketError('max_reconnect_attempts', error);
      } else {
        // Handle connection error but don't logout yet
        errorHandler.handleWebSocketError('connection_error', error);
      }
      
      this.isConnecting = false;
    });

    this.socket.on("session-transferred", () => {
      this.socket.disconnect();
    });

    this.socket.on("pong", () => {
      // Reset reconnect attempts on successful pong
      this.reconnectAttempts = 0;
    });

    // Add data sync event handlers
    this.socket.on("data-sync-start", () => {
      this.pendingDataSync = true;
    });

    this.socket.on("data-sync-complete", () => {
      this.pendingDataSync = false;
      // Notify all data-update subscribers to refresh their data
      const handlers = this.eventHandlers.get("data-update") || new Set();
      handlers.forEach(handler => {
        handler({ type: "sync-complete" });
      });
    });

    this.socket.on("data-sync-error", (error) => {
      console.error("[WebSocket] Data sync error:", error);
      this.pendingDataSync = false;
      // Handle data sync error with centralized error handler
      errorHandler.handleWebSocketError('data_sync_error', error);
    });

    // Handle websocket-specific errors from server
    this.socket.on("websocket-error", (error) => {
      console.error("[WebSocket] Server websocket error:", error);
      if (error.type === 'invalid_session_data') {
        errorHandler.handleNoWebSocketForUser();
      } else {
        errorHandler.handleWebSocketError('server_error', error);
      }
    });

    // Add data update handler
    this.socket.on("data-update", (data) => {
      // Handle case where data comes as an array
      if (Array.isArray(data)) {
        if (data.length === 0) {
          console.warn("[WebSocket] Empty array received in data update");
          return;
        }
        // Use the first item if it's an array
        data = data[0];
      }

      // Preserve filter state for updates
      const preserveFilters = data.type === "update" || data.type === "add" || data.type === "delete";

        // Ensure data has the correct structure
      if (!data || typeof data !== 'object') {
        console.warn("[WebSocket] Invalid data update format:", data);
        return;
      }

      const rawData = data.data || data;

      // Standardize the data structure
      const standardizedData = {
        type: data.type || 'update',
        data: {
          // Ensure all required arrays exist with records structure
          wmmData: {
            records: Array.isArray(data.data.wmmData?.records) 
              ? data.data.wmmData.records 
              : Array.isArray(data.data.wmmData) 
                ? data.data.wmmData 
                : []
          },
          hrgData: {
            records: Array.isArray(data.data.hrgData?.records) 
              ? data.data.hrgData.records 
              : Array.isArray(data.data.hrgData) 
                ? data.data.hrgData 
                : []
          },
          fomData: {
            records: Array.isArray(data.data.fomData?.records) 
              ? data.data.fomData.records 
              : Array.isArray(data.data.fomData) 
                ? data.data.fomData 
                : []
          },
          calData: {
            records: Array.isArray(data.data.calData?.records) 
              ? data.data.calData.records 
              : Array.isArray(data.data.calData) 
                ? data.data.calData 
                : []
          },
          // Add Promo and Complimentary data
          promoData: {
            records: Array.isArray(data.data.promoData?.records) 
              ? data.data.promoData.records 
              : Array.isArray(data.data.promoData) 
                ? data.data.promoData 
                : []
          },
          compData: {
            records: Array.isArray(data.data.compData?.records) 
              ? data.data.compData.records 
              : Array.isArray(data.data.compData) 
                ? data.data.compData 
                : []
          },
          // Ensure services array is properly built
          services: Array.from(new Set([
            ...(Array.isArray(data.data.services) ? data.data.services : []),
            // Add service types based on data presence
            ...(data.data.wmmData?.records?.length > 0 || data.data.wmmData?.length > 0 ? ['WMM'] : []),
            ...(data.data.hrgData?.records?.length > 0 || data.data.hrgData?.length > 0 ? ['HRG'] : []),
            ...(data.data.fomData?.records?.length > 0 || data.data.fomData?.length > 0 ? ['FOM'] : []),
            ...(data.data.calData?.records?.length > 0 || data.data.calData?.length > 0 ? ['CAL'] : []),
            ...(data.data.promoData?.records?.length > 0 || data.data.promoData?.length > 0 ? ['PROMO'] : []),
            ...(data.data.compData?.records?.length > 0 || data.data.compData?.length > 0 ? ['COMP'] : []),
            // Add group-based services
            ...(data.data.group === 'DCS' ? ['DCS'] : []),
            ...(data.data.group === 'MCCJ-ASIA' ? ['MCCJ-ASIA'] : []),
            ...(data.data.group === 'MCCJ' ? ['MCCJ'] : [])
          ])),
          // Ensure other required fields exist
          id: data.data.id,
          title: data.data.title || "",
          fname: data.data.fname || "",
          mname: data.data.mname || "",
          lname: data.data.lname || "",
          address: data.data.address || "",
          cellno: data.data.cellno || "",
          officeno: data.data.officeno || "",
          email: data.data.email || "",
          acode: data.data.acode || "",
          adduser: data.data.adduser || "",
          adddate: data.data.adddate || "",
          editedBy: data.data.editedBy || "",
          editedAt: data.data.editedAt || "",
          group: data.data.group || ""
        },
        timestamp: data.timestamp || Date.now(),
        sourceUserId: data.sourceUserId
      };

      // Notify subscribers
      const handlers = this.eventHandlers.get("data-update") || new Set();
      handlers.forEach(handler => handler(standardizedData));
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

  /**
   * Handle "No websocket for this user" error
   */
  handleNoWebSocketForUser() {
    errorHandler.handleNoWebSocketForUser();
  }

  reconnect() {
    // Only try to reconnect if we have valid session data
    if (this.sessionData.userId && this.sessionData.username && this.sessionData.sessionId) {
      this.connect({ query: this.sessionData });
    } else {
      console.warn("[WebSocket] Cannot reconnect: No valid session data");
    }
  }

  subscribe(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    // Wrap the handler 
    const wrappedHandler = (data) => {
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
        // Wait for the socket to be created before trying to use it
        const checkSocket = () => {
          if (this.socket) {
            this.socket.once('connect', () => {
              this.socket.emit(event, this._formatEventData(event, data));
            });
          } else {
            // If socket is still not created, wait a bit more
            setTimeout(checkSocket, 100);
          }
        };
        checkSocket();
        return;
      } else {
        console.warn("[WebSocket] Cannot emit: No valid user data available for connection");
        return;
      }
    }
    
    this.socket.emit(event, this._formatEventData(event, data));
  }

  _formatEventData(event, data) {
    // Only format data-update events
    if (event !== 'data-update') {
      return data;
    }

    // If data is an array, take the first item
    const updateData = Array.isArray(data) ? data[0] : data;
    const clientData = updateData.data || updateData;

    // Format the data according to the expected structure
    return {
      type: updateData.type || 'update',
      data: {
        ...clientData,
        // Ensure service data has records structure
        wmmData: {
          records: Array.isArray(clientData.wmmData?.records)
            ? clientData.wmmData.records
            : Array.isArray(clientData.wmmData)
              ? clientData.wmmData
              : []
        },
        hrgData: {
          records: Array.isArray(clientData.hrgData?.records)
            ? clientData.hrgData.records
            : Array.isArray(clientData.hrgData)
              ? clientData.hrgData
              : []
        },
        fomData: {
          records: Array.isArray(clientData.fomData?.records)
            ? clientData.fomData.records
            : Array.isArray(clientData.fomData)
              ? clientData.fomData
              : []
        },
        calData: {
          records: Array.isArray(clientData.calData?.records)
            ? clientData.calData.records
            : Array.isArray(clientData.calData)
              ? clientData.calData
              : []
        },
        promoData: {
          records: Array.isArray(clientData.promoData?.records)
            ? clientData.promoData.records
            : Array.isArray(clientData.promoData)
              ? clientData.promoData
              : []
        },
        compData: {
          records: Array.isArray(clientData.compData?.records)
            ? clientData.compData.records
            : Array.isArray(clientData.compData)
              ? clientData.compData
              : []
        },
        // Ensure services array is properly built
        services: Array.from(new Set([
          ...(Array.isArray(clientData.services) ? clientData.services : []),
          ...(clientData.wmmData?.records?.length > 0 || clientData.wmmData?.length > 0 ? ['WMM'] : []),
          ...(clientData.hrgData?.records?.length > 0 || clientData.hrgData?.length > 0 ? ['HRG'] : []),
          ...(clientData.fomData?.records?.length > 0 || clientData.fomData?.length > 0 ? ['FOM'] : []),
          ...(clientData.calData?.records?.length > 0 || clientData.calData?.length > 0 ? ['CAL'] : []),
          ...(clientData.promoData?.records?.length > 0 || clientData.promoData?.length > 0 ? ['PROMO'] : []),
          ...(clientData.compData?.records?.length > 0 || clientData.compData?.length > 0 ? ['COMP'] : []),
          ...(clientData.group === 'DCS' ? ['DCS'] : []),
          ...(clientData.group === 'MCCJ-ASIA' ? ['MCCJ-ASIA'] : []),
          ...(clientData.group === 'MCCJ' ? ['MCCJ'] : [])
        ]))
      },
      timestamp: Date.now(),
      sourceUserId: this.sessionData.userId
    };
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

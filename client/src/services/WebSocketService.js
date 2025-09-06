import { io } from "socket.io-client";
import errorHandler from "./errorHandler";

class WebSocketService {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10; // Increased for better resilience
    this.isConnecting = false;
    this.connectionQueue = [];
    this.connectionEstablished = false;
    this.pendingDataSync = false;
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.connectionTimeout = null;
    this.directEventHandlers = new Map();
    this.connectionState = "disconnected"; // 'connecting', 'connected', 'disconnected', 'reconnecting'
    this.lastConnectionAttempt = 0;
    this.connectionRetryDelay = 1000; // Start with 1 second
    this.maxConnectionRetryDelay = 30000; // Max 30 seconds
    this.beforeUnloadHandler = null;
    this.visibilityChangeHandler = null;
    this.onlineHandler = null;
    this.offlineHandler = null;

    this.sessionData = {
      userId: null,
      username: null,
      sessionId: null,
      socketId: null,
      lastConnected: null,
      connectionId: null, // Unique connection identifier
    };

    // Restore session data from localStorage if available
    this.restoreSession();
    this.setupConnectionPersistence();
    this.setupBrowserEventHandlers();

    // Add debug flag
    this.debug = true;
  }

  setupConnectionPersistence() {
    // Generate a unique connection ID for this browser session
    if (!this.sessionData.connectionId) {
      this.sessionData.connectionId = `conn_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      localStorage.setItem("connectionId", this.sessionData.connectionId);
    }

    // Store connection state in sessionStorage for page refresh recovery
    this.saveConnectionState();
  }

  setupBrowserEventHandlers() {
    // Handle page visibility changes (tab switching, minimizing)
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === "visible") {
        this.handlePageVisible();
      } else {
        this.handlePageHidden();
      }
    };
    document.addEventListener("visibilitychange", this.visibilityChangeHandler);

    // Handle online/offline status
    this.onlineHandler = () => {
      this.handleOnline();
    };
    window.addEventListener("online", this.onlineHandler);

    this.offlineHandler = () => {
      this.handleOffline();
    };
    window.addEventListener("offline", this.offlineHandler);

    // Handle beforeunload (page refresh/close)
    this.beforeUnloadHandler = () => {
      this.handleBeforeUnload();
    };
    window.addEventListener("beforeunload", this.beforeUnloadHandler);

    // Handle page load (recovery from refresh)
    window.addEventListener("load", () => {
      this.handlePageLoad();
    });
  }

  handlePageVisible() {
    if (
      this.connectionState === "disconnected" ||
      this.connectionState === "reconnecting"
    ) {
      this.attemptReconnection();
    } else if (this.socket && !this.socket.connected) {
      this.reconnect();
    }
  }

  handlePageHidden() {
    // Intentionally left blank: Keep connection alive but no action required
  }

  handleOnline() {
    if (this.connectionState === "disconnected") {
      this.attemptReconnection();
    }
  }

  handleOffline() {
    this.connectionState = "disconnected";
    this.saveConnectionState();
  }

  handleBeforeUnload() {
    // Save current connection state before page unloads
    this.saveConnectionState();

    // Send a quick disconnect signal if possible
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit("page-unloading", {
          connectionId: this.sessionData.connectionId,
          timestamp: Date.now(),
        });
      } catch (e) {
        // Ignore errors during page unload
      }
    }
  }

  handlePageLoad() {
    this.restoreConnectionState();

    // Attempt to reconnect if we have valid session data
    if (
      this.sessionData.userId &&
      this.sessionData.username &&
      this.sessionData.sessionId
    ) {
      setTimeout(() => {
        this.attemptReconnection();
      }, 1000); // Small delay to ensure page is fully loaded
    }
  }

  saveConnectionState() {
    const state = {
      connectionState: this.connectionState,
      sessionData: this.sessionData,
      lastConnected: this.sessionData.lastConnected,
      reconnectAttempts: this.reconnectAttempts,
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem("websocketState", JSON.stringify(state));
    } catch (e) {
      console.warn("[WebSocket] Could not save connection state:", e);
    }
  }

  restoreConnectionState() {
    try {
      const savedState = sessionStorage.getItem("websocketState");
      if (savedState) {
        const state = JSON.parse(savedState);
        this.connectionState = state.connectionState || "disconnected";
        this.reconnectAttempts = state.reconnectAttempts || 0;

        // Only restore session data if it's not already set
        if (!this.sessionData.userId && state.sessionData) {
          this.sessionData = { ...this.sessionData, ...state.sessionData };
        }
      }
    } catch (e) {
      console.warn("[WebSocket] Could not restore connection state:", e);
    }
  }

  restoreSession() {
    const sessionId = localStorage.getItem("sessionId");
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    const connectionId = localStorage.getItem("connectionId");

    if (sessionId && userId && username) {
      this.sessionData = {
        sessionId,
        userId,
        username,
        socketId: null,
        lastConnected: null,
        connectionId: connectionId || this.sessionData.connectionId,
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
      if (
        this.sessionData.userId &&
        this.sessionData.username &&
        this.sessionData.sessionId
      ) {
        options.query = { ...this.sessionData };
      } else {
        console.warn("[WebSocket] Cannot connect without valid user data");
        return;
      }
    }

    this.isConnecting = true;
    this.connectionState = "connecting";
    this.saveConnectionState();

    const sessionId =
      options.query?.sessionId ||
      this.sessionData.sessionId ||
      localStorage.getItem("sessionId");

    const userId = options.query?.userId || this.sessionData.userId;
    const username = options.query?.username || this.sessionData.username;

    if (
      !sessionId ||
      !userId ||
      !username ||
      userId === "null" ||
      username === "null" ||
      sessionId === "null"
    ) {
      console.warn("[WebSocket] Cannot connect without valid user data");
      this.isConnecting = false;
      this.connectionState = "disconnected";
      this.saveConnectionState();
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
      query: {
        ...this.sessionData,
        connectionId: this.sessionData.connectionId,
        reconnectAttempt: this.reconnectAttempts,
      },
      reconnection: false, // We'll handle reconnection manually
      autoConnect: true,
      forceNew: true,
      timeout: 20000,
      pingTimeout: 30000,
      pingInterval: 25000,
      transports: ["websocket", "polling"], // Try WebSocket first, fallback to polling
    });

    // Setup ping interval to keep connection alive
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("ping");
      }
    }, 25000);

    // Set a connection timeout
    this.connectionTimeout = setTimeout(() => {
      if (!this.connectionEstablished) {
        console.warn("[WebSocket] Connection timeout, attempting reconnect...");
        this.handleConnectionTimeout();
      }
    }, 15000); // Increased timeout

    // Reattach direct event handlers
    this.directEventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket.on(event, handler);
      });
    });

    this.socket.on("connect", () => {
      this.reconnectAttempts = 0;
      this.sessionData.socketId = this.socket.id;
      this.sessionData.lastConnected = Date.now();
      this.isConnecting = false;
      this.connectionEstablished = true;
      this.connectionState = "connected";
      this.connectionRetryDelay = 1000; // Reset retry delay on successful connection

      this.saveConnectionState();

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
      this.connectionState = "disconnected";
      this.saveConnectionState();

      // Clear ping interval on disconnect
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      if (
        reason === "io server disconnect" ||
        reason === "client namespace disconnect"
      ) {
        // Set a timer to reconnect
        this.reconnectTimer = setTimeout(() => {
          this.attemptReconnection();
        }, 2000);
      }
      this.isConnecting = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error.message);
      this.reconnectAttempts++;
      this.connectionState = "disconnected";
      this.saveConnectionState();

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("[WebSocket] Max reconnection attempts reached");
        errorHandler.handleWebSocketError("max_reconnect_attempts", error);
      } else {
        errorHandler.handleWebSocketError("connection_error", error);
        // Exponential backoff for reconnection attempts
        this.connectionRetryDelay = Math.min(
          this.connectionRetryDelay * 1.5,
          this.maxConnectionRetryDelay
        );

        setTimeout(() => {
          this.attemptReconnection();
        }, this.connectionRetryDelay);
      }

      this.isConnecting = false;
    });

    this.socket.on("session-transferred", () => {
      this.socket.disconnect();
      setTimeout(() => {
        this.attemptReconnection();
      }, 1000);
    });

    this.socket.on("pong", () => {
      // Reset reconnect attempts on successful pong
      this.reconnectAttempts = 0;
      this.connectionRetryDelay = 1000;
    });

    // Add data sync event handlers
    this.socket.on("data-sync-start", () => {
      this.pendingDataSync = true;
    });

    this.socket.on("data-sync-complete", () => {
      this.pendingDataSync = false;
      // Notify all data-update subscribers to refresh their data
      const handlers = this.eventHandlers.get("data-update") || new Set();
      handlers.forEach((handler) => {
        handler({ type: "sync-complete" });
      });
    });

    this.socket.on("data-sync-error", (error) => {
      console.error("[WebSocket] Data sync error:", error);
      this.pendingDataSync = false;
      errorHandler.handleWebSocketError("data_sync_error", error);
    });

    // Handle websocket-specific errors from server
    this.socket.on("websocket-error", (error) => {
      console.error("[WebSocket] Server websocket error:", error);
      if (error.type === "invalid_session_data") {
        errorHandler.handleNoWebSocketForUser();
      } else {
        errorHandler.handleWebSocketError("server_error", error);
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

      // Ensure data has the correct structure
      if (!data || typeof data !== "object") {
        console.warn("[WebSocket] Invalid data update format:", data);
        return;
      }

      // Pass the data through directly to subscribers
      const handlers = this.eventHandlers.get("data-update") || new Set();
      handlers.forEach((handler) => handler(data));
    });
  }

  handleConnectionTimeout() {
    console.warn("[WebSocket] Connection timeout occurred");
    this.connectionState = "disconnected";
    this.saveConnectionState();

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnection();
    } else {
      errorHandler.handleWebSocketError(
        "connection_timeout",
        new Error("Connection timeout")
      );
    }
  }

  attemptReconnection() {
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;

    // Prevent too frequent reconnection attempts
    if (timeSinceLastAttempt < 1000) {
      setTimeout(() => this.attemptReconnection(), 1000 - timeSinceLastAttempt);
      return;
    }

    this.lastConnectionAttempt = now;

    if (this.connectionState === "connected" || this.isConnecting) {
      return; // Already connected or connecting
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WebSocket] Max reconnection attempts reached");
      return;
    }

    this.connectionState = "reconnecting";
    this.saveConnectionState();

    this.connect({ query: this.sessionData });
  }

  clearSession() {
    localStorage.removeItem("sessionId");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("connectionId");
    sessionStorage.removeItem("websocketState");

    this.sessionData = {
      userId: null,
      username: null,
      sessionId: null,
      socketId: null,
      lastConnected: null,
      connectionId: null,
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
    if (
      this.sessionData.userId &&
      this.sessionData.username &&
      this.sessionData.sessionId
    ) {
      this.attemptReconnection();
    } else {
      console.warn("[WebSocket] Cannot reconnect: No valid session data");
    }
  }

  // Method to force reconnection with fresh user data
  reconnectWithUserData(userData) {
    if (
      userData &&
      userData.id &&
      userData.username &&
      userData.roles &&
      Array.isArray(userData.roles) &&
      userData.roles.length > 0
    ) {

      // Update session data
      this.sessionData.userId = userData.id;
      this.sessionData.username = userData.username;

      // Store in localStorage
      localStorage.setItem("userId", userData.id);
      localStorage.setItem("username", userData.username);

      // Force reconnection
      this.attemptReconnection();
    } else {
      console.warn("[WebSocket] Cannot reconnect: Invalid user data");
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
      console.warn(
        "[WebSocket] Socket not initialized or not connected, connecting..."
      );
      if (this.sessionData.userId && this.sessionData.username) {
        this.connect({ query: this.sessionData });
      } else {
        console.warn(
          "[WebSocket] Cannot subscribe: No valid user data available for connection"
        );
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
      handlers.forEach((handler) => {
        if (this.socket) {
          this.socket.on(event, handler);
        }
      });
    });
  }

  requestDataSync() {
    if (!this.pendingDataSync && this.socket?.connected) {
      this.socket.emit("request-data-sync", {
        timestamp: Date.now(),
        connectionId: this.sessionData.connectionId,
      });
    }
  }

  emit(event, data) {
    if (!this.socket || !this.socket.connected) {
      console.warn(
        "[WebSocket] Socket not connected, attempting to connect first..."
      );
      if (this.sessionData.userId && this.sessionData.username) {
        this.connect({ query: this.sessionData });
        // Wait for the socket to be created before trying to use it
        const checkSocket = () => {
          if (this.socket) {
            this.socket.once("connect", () => {
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
        console.warn(
          "[WebSocket] Cannot emit: No valid user data available for connection"
        );
        return;
      }
    }

    this.socket.emit(event, this._formatEventData(event, data));
  }

  _formatEventData(event, data) {
    // Only format data-update events
    if (event !== "data-update") {
      return data;
    }

    // If data is an array, take the first item
    const updateData = Array.isArray(data) ? data[0] : data;
    const clientData = updateData.data || updateData;

    // Format the data according to the expected structure
    return {
      type: updateData.type || "update",
      data: {
        ...clientData,
        // Ensure service data has records structure
        wmmData: {
          records: Array.isArray(clientData.wmmData?.records)
            ? clientData.wmmData.records
            : Array.isArray(clientData.wmmData)
            ? clientData.wmmData
            : [],
        },
        hrgData: {
          records: Array.isArray(clientData.hrgData?.records)
            ? clientData.hrgData.records
            : Array.isArray(clientData.hrgData)
            ? clientData.hrgData
            : [],
        },
        fomData: {
          records: Array.isArray(clientData.fomData?.records)
            ? clientData.fomData.records
            : Array.isArray(clientData.fomData)
            ? clientData.fomData
            : [],
        },
        calData: {
          records: Array.isArray(clientData.calData?.records)
            ? clientData.calData.records
            : Array.isArray(clientData.calData)
            ? clientData.calData
            : [],
        },
        promoData: {
          records: Array.isArray(clientData.promoData?.records)
            ? clientData.promoData.records
            : Array.isArray(clientData.promoData)
            ? clientData.promoData
            : [],
        },
        compData: {
          records: Array.isArray(clientData.compData?.records)
            ? clientData.compData.records
            : Array.isArray(clientData.compData)
            ? clientData.compData
            : [],
        },
        // Ensure services array is properly built
        services: Array.from(
          new Set([
            ...(Array.isArray(clientData.services) ? clientData.services : []),
            ...(clientData.wmmData?.records?.length > 0 ||
            clientData.wmmData?.length > 0
              ? ["WMM"]
              : []),
            ...(clientData.hrgData?.records?.length > 0 ||
            clientData.hrgData?.length > 0
              ? ["HRG"]
              : []),
            ...(clientData.fomData?.records?.length > 0 ||
            clientData.fomData?.length > 0
              ? ["FOM"]
              : []),
            ...(clientData.calData?.records?.length > 0 ||
            clientData.calData?.length > 0
              ? ["CAL"]
              : []),
            ...(clientData.promoData?.records?.length > 0 ||
            clientData.promoData?.length > 0
              ? ["PROMO"]
              : []),
            ...(clientData.compData?.records?.length > 0 ||
            clientData.compData?.length > 0
              ? ["COMP"]
              : []),
            ...(clientData.group === "DCS" ? ["DCS"] : []),
            ...(clientData.group === "MCCJ-ASIA" ? ["MCCJ-ASIA"] : []),
            ...(clientData.group === "MCCJ" ? ["MCCJ"] : []),
          ])
        ),
      },
      timestamp: Date.now(),
      sourceUserId: this.sessionData.userId,
    };
  }

  disconnect() {
    // Remove browser event handlers
    if (this.visibilityChangeHandler) {
      document.removeEventListener(
        "visibilitychange",
        this.visibilityChangeHandler
      );
    }
    if (this.onlineHandler) {
      window.removeEventListener("online", this.onlineHandler);
    }
    if (this.offlineHandler) {
      window.removeEventListener("offline", this.offlineHandler);
    }
    if (this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    }

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
      this.connectionState = "disconnected";
      this.saveConnectionState();
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.socket?.connected || false,
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      sessionData: this.sessionData,
      lastConnected: this.sessionData.lastConnected,
    };
  }
}

const webSocketService = new WebSocketService(
  `http://${import.meta.env.VITE_IP_ADDRESS}:3001`
);

export { webSocketService };

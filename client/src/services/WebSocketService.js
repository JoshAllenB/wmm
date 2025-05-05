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

    this.sessionData = {
      userId: null,
      username: null,
      sessionId: null,
      socketId: null,
    };
  }

  connect(options = {}) {
    console.log("Connecting to WebSocket with options:", options);

    // If already connecting, queue this connection attempt
    if (this.isConnecting) {
      this.connectionQueue.push(options);
      return;
    }

    // Skip if we don't have valid query data
    if (!options.query || !options.query.userId || !options.query.username) {
      // Check if we have stored session data already
      if (this.connectionEstablished && this.sessionData.userId && this.sessionData.username) {
        // Use stored session data instead
        options.query = { ...this.sessionData };
      } else {
        console.warn("Cannot connect to WebSocket without valid user data");
        return;
      }
    }

    this.isConnecting = true;

    // Validate required user data before connecting
    const sessionId = 
      options.query?.sessionId || 
      localStorage.getItem("sessionId");
    
    const userId = options.query?.userId;
    const username = options.query?.username;

    // Prevent connection with null/undefined values
    if (
      !sessionId ||
      !userId ||
      !username ||
      userId === "null" ||
      username === "null" ||
      sessionId === "null"
    ) {
      console.warn("Cannot connect to WebSocket without valid user data");
      this.isConnecting = false;
      return;
    }

    // Store session ID for future use
    if (sessionId && !localStorage.getItem("sessionId")) {
      localStorage.setItem("sessionId", sessionId);
    }

    if (this.socket) {
      // If socket exists and is connected, just update the session data
      if (this.socket.connected) {
        this.sessionData = {
          ...this.sessionData,
          sessionId,
          userId,
          username,
        };
        this.isConnecting = false;
        return;
      }
      
      // Disconnect the existing socket if it's not connected
      this.socket.disconnect();
      this.socket = null;
    }

    this.sessionData = {
      ...this.sessionData,
      sessionId,
      userId,
      username,
    };

    this.socket = io(this.url, {
      query: this.sessionData,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on("connect", () => {
      console.log("Connected to WebSocket");
      this.reconnectAttempts = 0;
      this.sessionData.socketId = this.socket.id;
      this.isConnecting = false;
      this.connectionEstablished = true;
      
      // Process any queued connection attempts
      if (this.connectionQueue.length > 0) {
        const nextOptions = this.connectionQueue.shift();
        this.connect(nextOptions);
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket:", reason);
      if (reason === "io server disconnect") {
        this.reconnect();
      }
      this.isConnecting = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("Max reconnection attempts reached");
      }
      this.isConnecting = false;
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
    if (!this.socket || !this.socket.connected) {
      console.warn("Socket not initialized or not connected, connecting...");
      // Only try to reconnect if we have stored session data
      if (this.sessionData.userId && this.sessionData.username) {
        this.connect({ query: this.sessionData });
      } else {
        console.warn("Cannot subscribe: No valid user data available for connection");
      }
    }

    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);

    if (this.socket) {
      this.socket.on(event, handler);
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
      console.warn("Socket not connected, attempting to connect first...");
      // Only try to reconnect if we have stored session data
      if (this.sessionData.userId && this.sessionData.username) {
        this.connect({ query: this.sessionData });
        // Queue this emit for after connection
        this.socket.once('connect', () => {
          this.socket.emit(event, data);
        });
        return;
      } else {
        console.warn("Cannot emit: No valid user data available for connection");
        return;
      }
    }
    this.socket.emit(event, data);
  }

  disconnect() {
    if (this.socket) {
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

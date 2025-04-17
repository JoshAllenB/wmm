import { io } from "socket.io-client";

class WebSocketService {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;

    this.sessionData = {
      userId: null,
      username: null,
      sessionId: null,
      socketId: null,
    };
  }

  connect(options = {}) {
    console.log("Connecting to WebSocket with options:", options);

    // Validate required user data before connecting
    const sessionId =
      localStorage.getItem("sessionId") || options.query?.sessionId;
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
      return;
    }

    if (this.socket) {
      // Disconnect the existing socket if new options are provided
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
      query: this.sessionData, // Include session data in query
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on("connect", () => {
      console.log("Connected to WebSocket");
      this.reconnectAttempts = 0;
      this.sessionData.socketId = this.socket.id;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket:", reason);
      if (reason === "io server disconnect") {
        this.reconnect(options);
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("Max reconnection attempts reached");
      }
    });
  }

  // reconnect(options = {}) {
  //   console.log("Attempting to reconnect...");

  //   this.connect({ query: this.sessionData });
  // }

  subscribe(event, handler) {
    if (!this.socket) {
      console.warn("Socket not initialized, connecting...");
      this.connect();
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
    if (!this.socket) {
      console.warn("Socket not initialized, connecting...");
      this.connect();
      return;
    }
    this.socket.emit(event, data);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const webSocketService = new WebSocketService(
  `http://${import.meta.env.VITE_IP_ADDRESS}:3001`
);

// Automatically reconnect on page load if sessionId exists
const sessionId = localStorage.getItem("sessionId");
if (sessionId) {
  webSocketService.connect({
    query: {
      sessionId,
    },
  });
}

export { webSocketService };

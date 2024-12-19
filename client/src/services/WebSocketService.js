import { io } from "socket.io-client";

class WebSocketService {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.connect();
  }

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(this.url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on("connect", () => {
      console.log("Connected to WebSocket");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket:", reason);
      if (reason === "io server disconnect") {
        this.connect();
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

const webSocketService = new WebSocketService("http://localhost:3001");
export { webSocketService };

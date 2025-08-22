import { useContext } from "react";
import { SocketContext } from "./SocketContext";

export const useSocket = () => {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  const { socket, socketData, connected, connectionStatus, updateConnectionStatus } = context;

  return {
    socket,
    socketData,
    connected,
    connectionStatus,
    updateConnectionStatus,
    emit: (event, data) => socket.emit(event, data),
    subscribe: (event, handler) => socket.subscribe(event, handler),
    unsubscribe: (event, handler) => socket.unsubscribe(event, handler),
    reconnect: () => socket.reconnect(),
    getConnectionStatus: () => socket.getConnectionStatus(),
    // Helper methods for connection management
    isConnected: () => connected,
    isConnecting: () => connectionStatus.connectionState === 'connecting',
    isReconnecting: () => connectionStatus.connectionState === 'reconnecting',
    getReconnectAttempts: () => connectionStatus.reconnectAttempts,
    getMaxReconnectAttempts: () => connectionStatus.maxReconnectAttempts
  };
};

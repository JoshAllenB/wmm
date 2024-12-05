import { useContext } from "react";
import { SocketContext } from "./SocketContext";

export const useSocket = () => {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  const { socket, socketData } = context;

  return {
    socket,
    socketData,
    emit: (event, data) => socket.emit(event, data),
    subscribe: (event, handler) => socket.subscribe(event, handler),
    unsubscribe: (event, handler) => socket.unsubscribe(event, handler)
  };
};

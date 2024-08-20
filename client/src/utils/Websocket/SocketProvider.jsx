import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { SocketContext } from "./SocketContext";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [socketData, setSocketData] = useState(null);

  useEffect(() => {
    const newSocket = io("http://localhost:3001");

    const eventHandlers = {
      connect: () => {},
      "data-update": setSocketData,
      "hrg-update": setSocketData,
      "user-update": setSocketData,
      disconnect: () => {},
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      newSocket.on(event, handler);
    });

    setSocket(newSocket);

    return () => {
      Object.keys(eventHandlers).forEach((event) => {
        newSocket.off(event);
      });
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, socketData }}>
      {children}
    </SocketContext.Provider>
  );
};

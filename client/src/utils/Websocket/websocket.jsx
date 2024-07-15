import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [socketData, setSocketData] = useState(null);

  useEffect(() => {
    const newSocket = io("http://localhost:3001");

    newSocket.on("connect", () => {});

    newSocket.on("data-update", (data) => {
      setSocketData(data);
    });

    newSocket.on("user-update", (data) => {
      setSocketData(data);
    });

    newSocket.on("disconnect", () => {});

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, socketData }}>
      {children}
    </SocketContext.Provider>
  );
};

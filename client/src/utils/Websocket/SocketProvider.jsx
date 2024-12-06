import { useEffect, useState, useCallback } from "react";
import { SocketContext } from "./SocketContext";
import { webSocketService } from "../../services/WebSocketService";

export const SocketProvider = ({ children }) => {
  const [socketData, setSocketData] = useState(null);

  useEffect(() => {
    webSocketService.connect();

    const handleSocketData = (data) => {
      setSocketData({ ...data });
    };

    const events = ["data-update", "hrg-update", "user-update"];
    events.forEach((event) => {
      webSocketService.subscribe(event, handleSocketData);
    });

    return () => {
      events.forEach((event) => {
        webSocketService.unsubscribe(event, handleSocketData);
      });
      webSocketService.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: webSocketService, socketData }}>
      {children}
    </SocketContext.Provider>
  );
};

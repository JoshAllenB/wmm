import { useEffect, useState, useCallback } from "react";
import { SocketContext } from "./SocketContext";
import { webSocketService } from "../../services/WebSocketService";

export const SocketProvider = ({ children }) => {
  const [socketData, setSocketData] = useState(null);

  const handleSocketData = useCallback((data) => {
    setSocketData(data);
  }, []);

  useEffect(() => {
    webSocketService.connect();

    // Subscribe to events
    const events = ['data-update', 'hrg-update', 'user-update'];
    events.forEach(event => {
      webSocketService.subscribe(event, handleSocketData);
    });

    return () => {
      events.forEach(event => {
        webSocketService.unsubscribe(event, handleSocketData);
      });
      webSocketService.disconnect();
    };
  }, [handleSocketData]);

  return (
    <SocketContext.Provider value={{ socket: webSocketService, socketData }}>
      {children}
    </SocketContext.Provider>
  );
};

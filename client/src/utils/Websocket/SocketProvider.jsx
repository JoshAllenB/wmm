import { useEffect, useState, useContext } from "react";
import { SocketContext } from "./SocketContext";
import { webSocketService } from "../../services/WebSocketService";
import { useUser } from "../Hooks/userProvider";

export const SocketProvider = ({ children }) => {
  const [socketData, setSocketData] = useState(null);
  const { userData } = useUser();
  const [connected, setConnected] = useState(false);

  // Effect for handling connection
  useEffect(() => {
    // Only try to connect if we have valid user data
    if (userData && userData.id && userData.username) {
      const sessionId = localStorage.getItem("sessionId");
      console.log("SocketProvider: Connecting with user data", {
        userId: userData.id,
        username: userData.username,
        sessionId,
      });

      webSocketService.connect({
        query: {
          userId: userData.id,
          username: userData.username,
          sessionId,
        },
      });

      setConnected(true);
    }
  }, [userData]);

  // Effect for handling event subscriptions
  useEffect(() => {
    // Only subscribe if connected
    if (connected) {
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
      };
    }
  }, [connected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      webSocketService.disconnect();
      setConnected(false);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket: webSocketService, socketData, connected }}
    >
      {children}
    </SocketContext.Provider>
  );
};

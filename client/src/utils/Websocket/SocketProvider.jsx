import { useEffect, useState, useContext, useRef } from "react";
import { SocketContext } from "./SocketContext";
import { webSocketService } from "../../services/WebSocketService";
import { useUser } from "../Hooks/userProvider";

export const SocketProvider = ({ children }) => {
  const [socketData, setSocketData] = useState(null);
  const { userData } = useUser();
  const [connected, setConnected] = useState(false);
  const connectionAttemptRef = useRef(false);
  const lastEventRef = useRef(null);

  // Effect for handling connection
  useEffect(() => {
    // Only try to connect if we have valid user data and haven't attempted connection
    if (userData?.id && userData?.username && !connectionAttemptRef.current) {
      const sessionId = localStorage.getItem("sessionId");
      console.log("[SocketProvider] Initializing connection:", {
        userId: userData.id,
        username: userData.username,
        sessionId
      });
      
      connectionAttemptRef.current = true;

      // Setup connection handlers first
      const onConnect = () => {
        console.log("[SocketProvider] Connection established");
        setConnected(true);
      };

      const onDisconnect = (reason) => {
        console.log("[SocketProvider] Disconnected:", reason);
        setConnected(false);
      };

      webSocketService.on('connect', onConnect);
      webSocketService.on('disconnect', onDisconnect);
      
      // Then initiate connection
      webSocketService.connect({
        query: {
          userId: userData.id,
          username: userData.username,
          sessionId
        }
      });

      return () => {
        webSocketService.off('connect', onConnect);
        webSocketService.off('disconnect', onDisconnect);
        connectionAttemptRef.current = false;
      };
    }
  }, [userData]);

  // Effect for handling event subscriptions
  useEffect(() => {
    if (!connected) return;

    const handleSocketData = (data) => {
      // Ensure data has required fields
      const processedData = {
        type: data?.type || 'unknown',
        data: data?.data || {},
        timestamp: data?.timestamp || Date.now(),
        sourceUserId: data?.sourceUserId || null
      };

      // Prevent duplicate events
      const eventKey = `${processedData.type}-${processedData.timestamp}`;
      if (lastEventRef.current === eventKey) {
        return;
      }
      lastEventRef.current = eventKey;

      setSocketData(prev => {
        // Don't update if this is the same event
        if (prev?.timestamp === processedData.timestamp && 
            prev?.type === processedData.type) {
          return prev;
        }
        return processedData;
      });
    };

    const events = ["data-update", "hrg-update", "user-update"];
    const unsubscribers = events.map(event => 
      webSocketService.subscribe(event, handleSocketData)
    );

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [connected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connected) {
        webSocketService.disconnect();
        setConnected(false);
        connectionAttemptRef.current = false;
        lastEventRef.current = null;
      }
    };
  }, [connected]);

  return (
    <SocketContext.Provider value={{ socket: webSocketService, socketData, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

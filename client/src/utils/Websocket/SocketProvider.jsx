import { useEffect, useState, useContext, useCallback } from "react";
import { SocketContext } from "./SocketContext";
import { webSocketService } from "../../services/WebSocketService";
import { useUser } from "../Hooks/userProvider";
import backupNotificationService from "../../services/BackupNotificationService";

export const SocketProvider = ({ children }) => {
  const [socketData, setSocketData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    connectionState: "disconnected",
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
  });
  const { userData } = useUser();

  // Update connection status
  const updateConnectionStatus = useCallback(() => {
    const status = webSocketService.getConnectionStatus();
    setConnectionStatus(status);
  }, []);

  // Effect for handling connection
  useEffect(() => {
    // Only try to connect if we have valid user data with roles
    if (
      userData &&
      userData.id &&
      userData.username &&
      userData.roles &&
      Array.isArray(userData.roles) &&
      userData.roles.length > 0
    ) {
      const sessionId = localStorage.getItem("sessionId");

      // Set up connection status monitoring
      const checkConnectionStatus = () => {
        updateConnectionStatus();
      };

      // Check status immediately
      checkConnectionStatus();

      // Set up periodic status checks
      const statusInterval = setInterval(checkConnectionStatus, 5000);

      // Try to connect with user data
      webSocketService.connect({
        query: {
          userId: userData.id,
          username: userData.username,
          sessionId,
        },
      });

      // Listen for connection state changes
      const handleConnect = () => {
        updateConnectionStatus();
      };

      const handleDisconnect = () => {
        updateConnectionStatus();
        // Auto-reconnect on disconnect
        setTimeout(() => {
          if (!webSocketService.getConnectionStatus().connected) {
            webSocketService.reconnectWithUserData(userData);
          }
        }, 2000);
      };

      // Add listeners for connection events
      webSocketService.on("connect", handleConnect);
      webSocketService.on("disconnect", handleDisconnect);

      return () => {
        clearInterval(statusInterval);
        webSocketService.off("connect", handleConnect);
        webSocketService.off("disconnect", handleDisconnect);
      };
    } else if (userData && userData.id && userData.username) {
      // If we have user data but no roles, try to reconnect with fresh data
      setTimeout(() => {
        webSocketService.reconnectWithUserData(userData);
      }, 1000);
    }
  }, [userData, updateConnectionStatus]);

  // Effect for handling event subscriptions
  useEffect(() => {
    // Only subscribe if we have a connection
    if (connectionStatus.connected) {
      const handleSocketData = (data) => {
        setSocketData({ ...data });
      };

      const events = [
        "data-update",
        "hrg-update",
        "user-update",
        "accounting-update",
        "payment-update",
      ];
      events.forEach((event) => {
        webSocketService.subscribe(event, handleSocketData);
      });

      // Initialize backup notification service
      backupNotificationService.initialize(webSocketService);
      console.log("Backup notification service initialized");

      return () => {
        events.forEach((event) => {
          webSocketService.unsubscribe(event, handleSocketData);
        });
        // Cleanup backup notification service
        backupNotificationService.destroy();
        console.log("Backup notification service destroyed");
      };
    }
  }, [connectionStatus.connected]);

  // Effect for handling page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Page became visible, check connection status
        updateConnectionStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updateConnectionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't disconnect on unmount to maintain connection across component unmounts
      // Only update status
      updateConnectionStatus();
    };
  }, [updateConnectionStatus]);

  return (
    <SocketContext.Provider
      value={{
        socket: webSocketService,
        socketData,
        connected: connectionStatus.connected,
        connectionStatus,
        updateConnectionStatus,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

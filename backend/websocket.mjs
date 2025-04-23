const initWebSocket = (io) => {
  global.io = io;

  const sessions = new Map(); // Map to track sessionId to user data
  global.socketIdMap = new Map(); // Map to track userId to socketId

  // Clean up any invalid sessions (without proper user information)
  const cleanupInvalidSessions = () => {
    let cleanedCount = 0;
    sessions.forEach((data, sessionId) => {
      if (
        !data.userId ||
        !data.username ||
        data.userId === "null" ||
        data.username === "null"
      ) {
        sessions.delete(sessionId);
        cleanedCount++;
      }
    });
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} invalid sessions`);
    }
  };

  const logConnectedUsers = () => {
    console.log("\n=== Connected Users ===");
    sessions.forEach(({ userId, username, socketId }, sessionId) => {
      console.log(`Session ID: ${sessionId}`);
      console.log(`- User ID: ${userId}`);
      console.log(`- Username: ${username}`);
      console.log(`- Socket ID: ${socketId}`);
      console.log("----------------------");
    });
    console.log(`Total Connected Users: ${sessions.size}`);
    console.log("========================\n");
  };

  // Perform initial cleanup
  cleanupInvalidSessions();

  io.on("connection", (socket) => {
    const { userId, username, sessionId } = socket.handshake.query;

    // Validate connection data - reject empty or "null" string values
    if (
      !sessionId ||
      !userId ||
      !username ||
      userId === "null" ||
      username === "null" ||
      sessionId === "null"
    ) {
      console.error("Invalid session data, disconnecting socket:", {
        userId,
        username,
        sessionId,
      });
      socket.disconnect();
      return;
    }

    // Check if the sessionId already exists
    if (sessions.has(sessionId)) {
      // Reconnection logic
      const existingSession = sessions.get(sessionId);
      existingSession.socketId = socket.id;
      global.socketIdMap.set(userId, socket.id);
      // Store socketId for session
      sessions.set(sessionId, existingSession);
      console.log(
        `Reconnected session: ${sessionId} for user: ${existingSession.username}`
      );
    } else {
      // New connection logic
      global.socketIdMap.set(userId, socket.id);

      const sessionData = {
        userId,
        username,
        socketId: socket.id,
        connectionTime: new Date(),
      };
      // Store session data
      sessions.set(sessionId, sessionData);
      console.log(
        `Socket Connected - UserID: ${userId}, SocketID: ${socket.id}`
      );
    }

    // Store socketId for session
    sessions.get(sessionId).socketId = socket.id;

    logConnectedUsers();

    // Log connected clients
    console.log("\n=== Client Connected ===");
    console.log(`Socket ID: ${socket.id}`);
    console.log(`User ID: ${userId}`);
    console.log(`Username: ${username}`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Total Sessions: ${sessions.size}`);
    console.log("========================\n");

    socket.on("data-update", (data) => {
      console.log("\n=== Data Update Event ===");
      console.log(`From Client: ${socket.id}`);
      console.log("Data:", data);

      // Broadcast to other clients
      socket.broadcast.emit("data-update", data);

      // Log which clients will receive the broadcast
      console.log("\nBroadcasting to clients:");
      sessions.forEach((client, id) => {
        if (id !== socket.id) {
          console.log(`- Client ${id}`);
        }
      });
      console.log("======================\n");
    });

    socket.on("hrg-update", (data) => {
      console.log("\n=== HRG Update Event ===");
      console.log(`From Client: ${socket.id}`);
      console.log("Data:", data);
      socket.broadcast.emit("hrg-update", data);
    });

    socket.on("user-update", (data) => {
      console.log("\n=== User Update Event ===");
      console.log(`From Client: ${socket.id}`);
      console.log("Data:", data);
      socket.broadcast.emit("user-update", data);
    });

    socket.on("disconnect", (reason) => {
      setTimeout(() => {
        // Get the user data from the session
        const sessionData = sessions.get(sessionId);
        
        // Only clean up if:
        // 1. The socket ID is no longer active AND
        // 2. The user hasn't reconnected with a different socket ID
        if (!io.sockets.sockets.has(socket.id) && 
            (!sessionData || sessionData.socketId === socket.id)) {
          global.socketIdMap.delete(userId);
          sessions.delete(sessionId);
          console.log(`Cleaned up disconnected user: ${userId}`);
        } else {
          console.log(`User ${userId} still active with different socket ID, not cleaning up.`);
        }
      }, 5000);

      // Log connected users after a disconnection
      logConnectedUsers();
    });
  });
};

export default initWebSocket;

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
      
      // Update the socket ID for this session
      existingSession.socketId = socket.id;
      
      // Update the global socket ID map
      global.socketIdMap.set(userId, socket.id);
      
      // If there was a previous socket, disconnect it
      const oldSocketId = existingSession.socketId;
      if (oldSocketId && oldSocketId !== socket.id && io.sockets.sockets.has(oldSocketId)) {
        io.sockets.sockets.get(oldSocketId).disconnect(true);
      }
      
      // Store updated session data
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

    // Join a room specific to this user
    socket.join(`user:${userId}`);

    logConnectedUsers();

    // Log connected clients
    console.log("\n=== Client Connected ===");
    console.log(`Socket ID: ${socket.id}`);
    console.log(`User ID: ${userId}`);
    console.log(`Username: ${username}`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Total Sessions: ${sessions.size}`);
    console.log("========================\n");

    // Add debug logging for all socket events
    socket.onAny((eventName, ...args) => {
      console.log(`\n=== Socket Event Received: ${eventName} ===`);
      console.log(`From Client: ${socket.id}`);
      console.log(`User ID: ${userId}`);
      console.log(`Username: ${username}`);
      console.log(`Event Data:`, args);
      console.log("========================\n");
    });

    socket.on("data-update", (data) => {
      console.log("\n=== Data Update Event ===");
      console.log(`From Client: ${socket.id}`);
      console.log(`User ID: ${userId}`);
      console.log(`Username: ${username}`);
      console.log("Data:", data);

      // Broadcast to all clients including sender
      io.emit("data-update", data);

      // Log which clients will receive the broadcast
      console.log("\nBroadcasting to all clients");
      console.log("======================\n");
    });

    socket.on("hrg-update", (data) => {
      console.log("\n=== HRG Update Event ===");
      console.log(`From Client: ${socket.id}`);
      console.log(`User ID: ${userId}`);
      console.log(`Username: ${username}`);
      console.log("Data:", data);
      io.emit("hrg-update", data);
    });

    socket.on("user-update", (data) => {
      console.log("\n=== User Update Event ===");
      console.log(`From Client: ${socket.id}`);
      console.log(`User ID: ${userId}`);
      console.log(`Username: ${username}`);
      console.log("Data:", data);
      io.emit("user-update", data);
    });

    socket.on("disconnect", (reason) => {
      console.log(`\n=== Client Disconnected ===`);
      console.log(`Socket ID: ${socket.id}`);
      console.log(`User ID: ${userId}`);
      console.log(`Username: ${username}`);
      console.log(`Reason: ${reason}`);
      console.log("========================\n");

      // Don't immediately remove the session on disconnect
      // Instead, wait a short period to allow for reconnection
      setTimeout(() => {
        const sessionData = sessions.get(sessionId);
        
        // Only clean up if:
        // 1. The session exists AND
        // 2. The socket ID matches (no new connection has taken over) AND
        // 3. The socket is not connected
        if (sessionData && 
            sessionData.socketId === socket.id && 
            !io.sockets.sockets.has(socket.id)) {
          
          // Remove from maps
          global.socketIdMap.delete(userId);
          sessions.delete(sessionId);
          
          // Leave the user-specific room
          socket.leave(`user:${userId}`);
          
          console.log(`Cleaned up disconnected session for user: ${userId}`);
        } else {
          console.log(`Session ${sessionId} still active or reconnected, not cleaning up`);
        }
        
        logConnectedUsers();
      }, 5000); // 5 second grace period for reconnection
    });
  });
};

export default initWebSocket;

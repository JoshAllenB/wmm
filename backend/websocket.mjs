import WmmModel from './models/wmm.mjs';
import HrgModel from './models/hrg.mjs';
import FomModel from './models/fom.mjs';
import CalModel from './models/cal.mjs';

const initWebSocket = (io) => {
  global.io = io;

  const sessions = new Map(); // Map to track sessionId to user data
  global.socketIdMap = new Map(); // Map to track userId to socketId

  const logDataUpdate = (type, data, userId, socketId) => {
    console.log(`\n[${type}] Update from User ${userId}`, {
      timestamp: new Date().toISOString(),
      socketId: socketId.substring(0, 8), // Only show first 8 chars
      dataType: Array.isArray(data) ? 'array' : typeof data,
      operation: data?.operation || 'unknown',
      affectedIds: data?.ids || data?.id || 'none'
    });
  };

  // Handle data sync request
  const handleDataSync = async (socket, userId) => {
    try {
      // Notify client that sync is starting
      socket.emit("data-sync-start");

      // Get the session info
      const sessionEntry = Array.from(sessions.entries())
        .find(([_, data]) => data.userId === userId);
      
      if (!sessionEntry) {
        throw new Error("Session not found");
      }

      const [sessionId, sessionData] = sessionEntry;

      // Only emit to the requesting socket
      socket.emit("data-sync-complete", {
        type: "sync-complete",
        timestamp: Date.now(),
        sessionId,
        userId
      });
      
      console.log("[Socket] Data sync completed for user:", userId);
    } catch (error) {
      console.error("[Socket] Data sync failed:", error);
      socket.emit("data-sync-error", { 
        error: "Failed to sync data",
        details: error.message 
      });
    }
  };

  // Configure socket.io settings
  io.engine.pingTimeout = 30000; // How long to wait for pong response
  io.engine.pingInterval = 25000; // How often to ping clients

  io.on("connection", (socket) => {
    const { userId, username, sessionId } = socket.handshake.query;

    // Validate connection data
    if (!sessionId || !userId || !username || userId === "null" || username === "null" || sessionId === "null") {
      console.error("[Socket] Invalid session data, disconnecting:", {
        userId,
        username: username || 'none',
        sessionId: sessionId || 'none'
      });
      socket.disconnect();
      return;
    }

    // Check if the sessionId already exists
    if (sessions.has(sessionId)) {
      const existingSession = sessions.get(sessionId);
      existingSession.socketId = socket.id;
      global.socketIdMap.set(userId, socket.id);
      
      const oldSocketId = existingSession.socketId;
      if (oldSocketId && oldSocketId !== socket.id && io.sockets.sockets.has(oldSocketId)) {
        io.sockets.sockets.get(oldSocketId).disconnect(true);
        console.log("[Socket] Disconnected old session:", {
          userId,
          oldSocketId: oldSocketId.substring(0, 8),
          newSocketId: socket.id.substring(0, 8)
        });
      }
      
      sessions.set(sessionId, existingSession);
    } else {
      global.socketIdMap.set(userId, socket.id);
      sessions.set(sessionId, {
        userId,
        username,
        socketId: socket.id,
        connectionTime: new Date(),
        lastPing: Date.now()
      });
    }

    console.log("[Socket] Connected:", {
      user: username,
      userId: userId,
      socketId: socket.id.substring(0, 8),
      totalSessions: sessions.size
    });

    // Handle ping messages
    socket.on("ping", () => {
      const session = sessions.get(sessionId);
      if (session) {
        session.lastPing = Date.now();
        sessions.set(sessionId, session);
      }
      socket.emit("pong");
    });

    // Handle data sync requests
    socket.on("request-data-sync", async (data) => {
      console.log("[Socket] Data sync requested by user:", userId);
      await handleDataSync(socket, userId);
    });

    // Join user-specific rooms for targeted events
    socket.join(`user:${userId}`);
    socket.join(`export:${userId}`);

    // Log connection details
    console.log("\n=== Client Connected ===");
    console.log(`Socket ID: ${socket.id}`);
    console.log(`User ID: ${userId}`);
    console.log(`Username: ${username}`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Rooms:`, Array.from(socket.rooms));
    console.log(`Total Sessions: ${sessions.size}`);
    console.log("========================\n");

    // Debug logging for all socket events
    socket.onAny((eventName, ...args) => {
      console.log(`\n=== Socket Event Received: ${eventName} ===`);
      console.log(`From Client: ${socket.id}`);
      console.log(`User ID: ${userId}`);
      console.log(`Username: ${username}`);
      console.log(`Event Data:`, args);
      console.log("========================\n");
    });

    // Handle export-specific events
    socket.on("export-start", (data) => {
      console.log("\n=== Export Start Event ===");
      console.log(`From Client: ${socket.id}`);
      console.log(`User ID: ${userId}`);
      console.log("Data:", data);
      io.to(`export:${userId}`).emit(`export-started-${userId}`, {
        status: "started",
        message: "Starting export process...",
        progress: 0
      });
    });

    socket.on("export-progress", (data) => {
      console.log("\n=== Export Progress Event ===");
      console.log(`From Client: ${socket.id}`);
      console.log(`User ID: ${userId}`);
      console.log("Data:", data);
      io.to(`export:${userId}`).emit(`export-progress-${userId}`, data);
    });

    socket.on("export-complete", (data) => {
      console.log("\n=== Export Complete Event ===");
      console.log(`From Client: ${socket.id}`);
      console.log(`User ID: ${userId}`);
      console.log("Data:", data);
      io.to(`export:${userId}`).emit(`export-complete-${userId}`, data);
    });

    socket.on("export-error", (data) => {
      console.log("\n=== Export Error Event ===");
      console.log(`From Client: ${socket.id}`);
      console.log(`User ID: ${userId}`);
      console.log("Data:", data);
      io.to(`export:${userId}`).emit(`export-error-${userId}`, data);
    });

    socket.on("data-update", async (data) => {
      const currentSession = sessions.get(sessionId);
      if (!currentSession || currentSession.socketId !== socket.id) {
        console.log("[Socket] Rejected invalid data update from:", socket.id.substring(0, 8));
        return;
      }

      logDataUpdate('Data', data, userId, socket.id);
      
      // Re-run the filter to get updated filtered data for all clients
      if (io) {
        try {
          const clientId = data.id || data.clientid;
          if (!clientId) {
            console.error("[Socket] No client ID in data update:", data);
            return;
          }

          // Get all subscription data for this client
          const [wmmData, hrgData, fomData, calData] = await Promise.all([
            WmmModel.find({ clientid: parseInt(clientId) }).sort({ subsdate: -1 }).lean(),
            HrgModel.find({ clientid: parseInt(clientId) }).sort({ recvdate: -1 }).lean(),
            FomModel.find({ clientid: parseInt(clientId) }).sort({ recvdate: -1 }).lean(),
            CalModel.find({ clientid: parseInt(clientId) }).sort({ recvdate: -1 }).lean()
          ]);

          // Emit the updated client data with all subscription data
          io.emit("data-update", {
            type: data.type || "update",
            data: {
              ...data,
              wmmData: wmmData || [],
              hrgData: hrgData || [],
              fomData: fomData || [],
              calData: calData || [],
              services: data.services || []
            }
          });

          console.log("[Socket] Emitted data update with subscription data for client:", clientId);
        } catch (error) {
          console.error("[Socket] Error processing data update:", error);
        }
      }
    });

    socket.on("hrg-update", (data) => {
      const currentSession = sessions.get(sessionId);
      if (!currentSession || currentSession.socketId !== socket.id) {
        console.log("[Socket] Rejected invalid HRG update from:", socket.id.substring(0, 8));
        return;
      }

      logDataUpdate('HRG', data, userId, socket.id);
      io.emit("hrg-update", {
        ...data,
        timestamp: Date.now(),
        sourceUserId: userId
      });
    });

    socket.on("user-update", (data) => {
      const currentSession = sessions.get(sessionId);
      if (!currentSession || currentSession.socketId !== socket.id) {
        console.log("[Socket] Rejected invalid user update from:", socket.id.substring(0, 8));
        return;
      }

      logDataUpdate('User', data, userId, socket.id);
      io.emit("user-update", {
        ...data,
        timestamp: Date.now(),
        sourceUserId: userId
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", {
        user: username,
        userId: userId,
        socketId: socket.id.substring(0, 8),
        reason,
        remainingSessions: sessions.size - 1
      });

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
          
          // Leave all rooms
          socket.leave(`user:${userId}`);
          socket.leave(`export:${userId}`);
          
          console.log(`[Socket] Cleaned up disconnected session for user: ${userId}`);
          
          // Log current connected users
          console.log("\n=== Connected Users ===");
          console.log(`Total Connected Users: ${sessions.size}`);
        } else {
          console.log(`[Socket] Session ${sessionId} still active or reconnected, not cleaning up`);
        }
      }, 5000); // 5 second grace period for reconnection
    });
  });

  // Periodic cleanup of stale sessions
  setInterval(() => {
    const now = Date.now();
    sessions.forEach((session, sessionId) => {
      // If last ping was more than 60 seconds ago
      if (now - session.lastPing > 60000) {
        console.log("[Socket] Cleaning up stale session:", {
          userId: session.userId,
          username: session.username,
          lastPing: new Date(session.lastPing).toISOString()
        });
        sessions.delete(sessionId);
        global.socketIdMap.delete(session.userId);
      }
    });
  }, 30000); // Run cleanup every 30 seconds
};

export default initWebSocket;

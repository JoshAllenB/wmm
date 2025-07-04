import WmmModel from './models/wmm.mjs';
import HrgModel from './models/hrg.mjs';
import FomModel from './models/fom.mjs';
import CalModel from './models/cal.mjs';
import dataService from './middleware/apiLogic/services/DataService.mjs';

const initWebSocket = (io) => {
  global.io = io;

  const sessions = new Map(); // Map to track sessionId to user data
  global.socketIdMap = new Map(); // Map to track userId to socketId

  // Minimal logging function for data updates
  const logDataUpdate = (type, data, userId, socketId) => {
    console.log(`[${type}] Update from User ${userId}`, {
      operation: data?.operation || 'unknown',
      affectedIds: data?.ids || data?.id || 'none'
    });
  };

  // Handle data sync request
  const handleDataSync = async (socket, userId) => {
    try {
      socket.emit("data-sync-start");

      const sessionEntry = Array.from(sessions.entries())
        .find(([_, data]) => data.userId === userId);
      
      if (!sessionEntry) {
        throw new Error("Session not found");
      }

      const [sessionId] = sessionEntry;

      socket.emit("data-sync-complete", {
        type: "sync-complete",
        timestamp: Date.now(),
        sessionId,
        userId
      });
    } catch (error) {
      console.error("[Socket] Data sync failed:", error.message);
      socket.emit("data-sync-error", { 
        error: "Failed to sync data",
        details: error.message 
      });
    }
  };

  // Configure socket.io settings
  io.engine.pingTimeout = 30000;
  io.engine.pingInterval = 25000;

  io.on("connection", (socket) => {
    const { userId, username, sessionId } = socket.handshake.query;

    // Validate connection data
    if (!sessionId || !userId || !username || userId === "null" || username === "null" || sessionId === "null") {
      console.error("[Socket] Invalid session data, disconnecting:", {
        userId,
        username: username || 'none'
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
      userId,
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
      await handleDataSync(socket, userId);
    });

    // Join user-specific rooms for targeted events
    socket.join(`user:${userId}`);
    socket.join(`export:${userId}`);

    // Debug logging for important socket events only
    const importantEvents = [
      "disconnect",
      "error",
      "data-update",
      "hrg-update",
      "user-update"
    ];

    socket.onAny((eventName, ...args) => {
      if (importantEvents.includes(eventName)) {
        console.log(`[Socket] ${eventName} from ${userId}`);
      }
    });

    // Handle export-specific events
    socket.on("export-start", (data) => {
      io.to(`export:${userId}`).emit(`export-started-${userId}`, {
        status: "started",
        message: "Starting export process...",
        progress: 0
      });
    });

    socket.on("export-progress", (data) => {
      io.to(`export:${userId}`).emit(`export-progress-${userId}`, data);
    });

    socket.on("export-complete", (data) => {
      io.to(`export:${userId}`).emit(`export-complete-${userId}`, data);
    });

    socket.on("export-error", (data) => {
      io.to(`export:${userId}`).emit(`export-error-${userId}`, data);
    });

    socket.on("data-update", async (data) => {
      const currentSession = sessions.get(sessionId);
      if (!currentSession || currentSession.socketId !== socket.id) {
        console.log("[Socket] Rejected invalid data update from:", userId);
        return;
      }

      logDataUpdate('Data', data, userId, socket.id);
      
      if (io) {
        try {
          const updateData = Array.isArray(data) ? data[0] : data;
          const clientData = updateData.data || updateData;
          const clientId = clientData.id || clientData.clientid;

          if (!clientId) {
            console.error("[Socket] No client ID in data update");
            return;
          }

          await new Promise(resolve => setTimeout(resolve, 100));

          const result = await dataService.fetchAllData({
            modelNames: ["WmmModel", "HrgModel", "FomModel", "CalModel"],
            filter: "",
            group: "",
            clientIds: [clientId],
            advancedFilterData: {}
          });

          const updatedClientData = result.combinedData.find(client => client.id === clientId);
          
          if (!updatedClientData) {
            console.error("[Socket] Client data not found:", clientId);
            return;
          }

          const updateEvent = [{
            type: updateData.type,
            data: {
              ...clientData,
              ...updatedClientData,
              wmmData: Array.isArray(updatedClientData.wmmData)
                ? updatedClientData.wmmData
                : (updatedClientData.wmmData?.records || []),
              hrgData: Array.isArray(updatedClientData.hrgData)
                ? updatedClientData.hrgData
                : (updatedClientData.hrgData?.records || []),
              fomData: Array.isArray(updatedClientData.fomData)
                ? updatedClientData.fomData
                : (updatedClientData.fomData?.records || []),
              calData: Array.isArray(updatedClientData.calData)
                ? updatedClientData.calData
                : (updatedClientData.calData?.records || []),
              services: Array.from(new Set([
                ...(clientData.services || []),
                ...(updatedClientData.services || [])
              ]))
            },
            timestamp: Date.now()
          }];

          io.emit("data-update", updateEvent);
        } catch (error) {
          console.error("[Socket] Error processing data update:", error.message);
        }
      }
    });

    socket.on("hrg-update", (data) => {
      const currentSession = sessions.get(sessionId);
      if (!currentSession || currentSession.socketId !== socket.id) {
        console.log("[Socket] Rejected invalid HRG update from:", userId);
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
        console.log("[Socket] Rejected invalid user update from:", userId);
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
        userId,
        reason
      });

      setTimeout(() => {
        const sessionData = sessions.get(sessionId);
        
        if (sessionData && 
            sessionData.socketId === socket.id && 
            !io.sockets.sockets.has(socket.id)) {
          
          global.socketIdMap.delete(userId);
          sessions.delete(sessionId);
          
          socket.leave(`user:${userId}`);
          socket.leave(`export:${userId}`);
        }
      }, 5000);
    });
  });

  // Periodic cleanup of stale sessions
  setInterval(() => {
    const now = Date.now();
    sessions.forEach((session, sessionId) => {
      if (now - session.lastPing > 60000) {
        sessions.delete(sessionId);
        global.socketIdMap.delete(session.userId);
      }
    });
  }, 30000);
};

export default initWebSocket;
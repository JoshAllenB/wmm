import WmmModel from './models/wmm.mjs';
import HrgModel from './models/hrg.mjs';
import FomModel from './models/fom.mjs';
import CalModel from './models/cal.mjs';
import dataService from './middleware/apiLogic/services/DataService.mjs';

// Helper function to format data events
const formatDataEvent = (type, data = {}, userId = null) => {
  return {
    type,
    data,
    timestamp: Date.now(),
    sourceUserId: userId
  };
};

const initWebSocket = (io) => {
  global.io = io;

  const sessions = new Map(); // Map to track sessionId to user data
  global.socketIdMap = new Map(); // Map to track userId to socketId
  const pendingReconnects = new Map(); // Map to track pending reconnection attempts

  // Minimal logging function for data updates
  const logDataUpdate = (type, data, userId, socketId) => {
    console.log(`[${type}] Update from User ${userId}`, {
      operation: data?.operation || 'unknown',
      affectedIds: data?.ids || data?.id || 'none',
      type: data?.type || type
    });
  };

  // Handle data sync request
  const handleDataSync = async (socket, userId) => {
    try {
      socket.emit("data-sync-start", formatDataEvent('sync-start'));

      const sessionEntry = Array.from(sessions.entries())
        .find(([_, data]) => data.userId === userId);
      
      if (!sessionEntry) {
        throw new Error("Session not found");
      }

      const [sessionId] = sessionEntry;

      socket.emit("data-sync-complete", formatDataEvent('sync-complete', {
        sessionId,
        userId
      }));
    } catch (error) {
      console.error("[Socket] Data sync failed:", error.message);
      socket.emit("data-sync-error", formatDataEvent('sync-error', { 
        error: "Failed to sync data",
        details: error.message 
      }));
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

    // Clear any pending reconnection attempts for this user
    if (pendingReconnects.has(userId)) {
      clearTimeout(pendingReconnects.get(userId));
      pendingReconnects.delete(userId);
    }

    // Check if the sessionId already exists
    if (sessions.has(sessionId)) {
      const existingSession = sessions.get(sessionId);
      const oldSocketId = existingSession.socketId;

      // If there's an existing socket with a different ID, handle the transition
      if (oldSocketId && oldSocketId !== socket.id) {
        // Keep the old socket alive briefly to ensure smooth transition
        setTimeout(() => {
          if (io.sockets.sockets.has(oldSocketId)) {
            const oldSocket = io.sockets.sockets.get(oldSocketId);
            oldSocket.emit('session-transferred', formatDataEvent('session-transferred'));
            oldSocket.disconnect(true);
            console.log("[Socket] Transferred session from old socket:", {
              oldSocketId,
              newSocketId: socket.id,
              userId
            });
          }
        }, 1000);
      }

      // Update the session with new socket info
      existingSession.socketId = socket.id;
      existingSession.lastPing = Date.now();
      existingSession.reconnectAttempts = 0;
      global.socketIdMap.set(userId, socket.id);
      sessions.set(sessionId, existingSession);

      console.log("[Socket] Updated existing session:", {
        user: username,
        userId,
        socketId: socket.id,
        totalSessions: sessions.size
      });
    } else {
      // Create new session
      global.socketIdMap.set(userId, socket.id);
      sessions.set(sessionId, {
        userId,
        username,
        socketId: socket.id,
        connectionTime: new Date(),
        lastPing: Date.now(),
        reconnectAttempts: 0
      });

      console.log("[Socket] Created new session:", {
        user: username,
        userId,
        socketId: socket.id,
        totalSessions: sessions.size
      });
    }

    // Emit initial user state
    socket.emit('user-update', formatDataEvent('init', {
      userId,
      username,
      sessionId,
      socketId: socket.id
    }));

    // Handle ping messages
    socket.on("ping", () => {
      const session = sessions.get(sessionId);
      if (session) {
        session.lastPing = Date.now();
        session.reconnectAttempts = 0; // Reset reconnect attempts on successful ping
        sessions.set(sessionId, session);
      }
      socket.emit("pong", formatDataEvent('pong'));
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
      io.to(`export:${userId}`).emit(`export-started-${userId}`, formatDataEvent('export-start', {
        status: "started",
        message: "Starting export process...",
        progress: 0
      }));
    });

    socket.on("export-progress", (data) => {
      io.to(`export:${userId}`).emit(`export-progress-${userId}`, formatDataEvent('export-progress', data));
    });

    socket.on("export-complete", (data) => {
      io.to(`export:${userId}`).emit(`export-complete-${userId}`, formatDataEvent('export-complete', data));
    });

    socket.on("export-error", (data) => {
      io.to(`export:${userId}`).emit(`export-error-${userId}`, formatDataEvent('export-error', data));
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

          // Structure the data according to our standard format
          const processedData = {
            // Base client info
            id: clientId,
            title: clientData.title || updatedClientData.title || "",
            fname: clientData.fname || updatedClientData.fname || "",
            mname: clientData.mname || updatedClientData.mname || "",
            lname: clientData.lname || updatedClientData.lname || "",
            address: clientData.address || updatedClientData.address || "",
            cellno: clientData.cellno || updatedClientData.cellno || "",
            officeno: clientData.officeno || updatedClientData.officeno || "",
            email: clientData.email || updatedClientData.email || "",
            acode: clientData.acode || updatedClientData.acode || "",
            adduser: clientData.adduser || updatedClientData.adduser || "",
            adddate: clientData.adddate || updatedClientData.adddate || "",
            editedBy: clientData.editedBy || updatedClientData.editedBy || "",
            editedAt: clientData.editedAt || updatedClientData.editedAt || "",
            group: clientData.group || updatedClientData.group || ""
          };

          // Add service-specific data with records array structure
          const wmmRecords = Array.isArray(updatedClientData.wmmData) 
            ? updatedClientData.wmmData 
            : Array.isArray(updatedClientData.wmmData?.records)
              ? updatedClientData.wmmData.records
              : [];

          const hrgRecords = Array.isArray(updatedClientData.hrgData)
            ? updatedClientData.hrgData
            : Array.isArray(updatedClientData.hrgData?.records)
              ? updatedClientData.hrgData.records
              : [];

          const fomRecords = Array.isArray(updatedClientData.fomData)
            ? updatedClientData.fomData
            : Array.isArray(updatedClientData.fomData?.records)
              ? updatedClientData.fomData.records
              : [];

          const calRecords = Array.isArray(updatedClientData.calData)
            ? updatedClientData.calData
            : Array.isArray(updatedClientData.calData?.records)
              ? updatedClientData.calData.records
              : [];

          // Add records to processed data
          processedData.wmmData = { records: wmmRecords };
          processedData.hrgData = { records: hrgRecords };
          processedData.fomData = { records: fomRecords };
          processedData.calData = { records: calRecords };

          // Build services array from available data
          processedData.services = Array.from(new Set([
            ...(clientData.services || []),
            ...(updatedClientData.services || []),
            // Add service types based on data presence
            ...(wmmRecords.length > 0 ? ['WMM'] : []),
            ...(hrgRecords.length > 0 ? ['HRG'] : []),
            ...(fomRecords.length > 0 ? ['FOM'] : []),
            ...(calRecords.length > 0 ? ['CAL'] : []),
            // Add group-based services
            ...(processedData.group === 'DCS' ? ['DCS'] : []),
            ...(processedData.group === 'MCCJ-ASIA' ? ['MCCJ-ASIA'] : []),
            ...(processedData.group === 'MCCJ' ? ['MCCJ'] : [])
          ]));

          // Emit the standardized data update
          io.emit("data-update", formatDataEvent(updateData.type || 'update', processedData, userId));
        } catch (error) {
          console.error("[Socket] Error processing data update:", error.message);
          socket.emit("data-update-error", formatDataEvent('error', {
            error: error.message,
            originalData: data
          }));
        }
      }
    });

    socket.on("hrg-update", async (data) => {
      const currentSession = sessions.get(sessionId);
      if (!currentSession || currentSession.socketId !== socket.id) {
        console.log("[Socket] Rejected invalid HRG update from:", userId);
        return;
      }

      logDataUpdate('HRG', data, userId, socket.id);
      
      try {
        const updateData = Array.isArray(data) ? data[0] : data;
        const clientData = updateData.data || updateData;
        const clientId = clientData.id || clientData.clientid;

        if (!clientId) {
          console.error("[Socket] No client ID in HRG update");
          return;
        }

        // Fetch latest client data
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

        // Structure the data according to our standard format
        const processedData = {
          // Base client info
          id: clientId,
          title: clientData.title || updatedClientData.title || "",
          fname: clientData.fname || updatedClientData.fname || "",
          mname: clientData.mname || updatedClientData.mname || "",
          lname: clientData.lname || updatedClientData.lname || "",
          address: clientData.address || updatedClientData.address || "",
          cellno: clientData.cellno || updatedClientData.cellno || "",
          officeno: clientData.officeno || updatedClientData.officeno || "",
          email: clientData.email || updatedClientData.email || "",
          acode: clientData.acode || updatedClientData.acode || "",
          adduser: clientData.adduser || updatedClientData.adduser || "",
          adddate: clientData.adddate || updatedClientData.adddate || "",
          editedBy: clientData.editedBy || updatedClientData.editedBy || "",
          editedAt: clientData.editedAt || updatedClientData.editedAt || "",
          group: clientData.group || updatedClientData.group || ""
        };

        // Add service-specific data with records array structure
        const wmmRecords = Array.isArray(updatedClientData.wmmData) 
          ? updatedClientData.wmmData 
          : Array.isArray(updatedClientData.wmmData?.records)
            ? updatedClientData.wmmData.records
            : [];

        const hrgRecords = Array.isArray(updatedClientData.hrgData)
          ? updatedClientData.hrgData
          : Array.isArray(updatedClientData.hrgData?.records)
            ? updatedClientData.hrgData.records
            : [];

        const fomRecords = Array.isArray(updatedClientData.fomData)
          ? updatedClientData.fomData
          : Array.isArray(updatedClientData.fomData?.records)
            ? updatedClientData.fomData.records
            : [];

        const calRecords = Array.isArray(updatedClientData.calData)
          ? updatedClientData.calData
          : Array.isArray(updatedClientData.calData?.records)
            ? updatedClientData.calData.records
            : [];

        // Add records to processed data
        processedData.wmmData = { records: wmmRecords };
        processedData.hrgData = { records: hrgRecords };
        processedData.fomData = { records: fomRecords };
        processedData.calData = { records: calRecords };

        // Build services array from available data
        processedData.services = Array.from(new Set([
          ...(clientData.services || []),
          ...(updatedClientData.services || []),
          // Add service types based on data presence
          ...(wmmRecords.length > 0 ? ['WMM'] : []),
          ...(hrgRecords.length > 0 ? ['HRG'] : []),
          ...(fomRecords.length > 0 ? ['FOM'] : []),
          ...(calRecords.length > 0 ? ['CAL'] : []),
          // Add group-based services
          ...(processedData.group === 'DCS' ? ['DCS'] : []),
          ...(processedData.group === 'MCCJ-ASIA' ? ['MCCJ-ASIA'] : []),
          ...(processedData.group === 'MCCJ' ? ['MCCJ'] : [])
        ]));

        // Emit the standardized data update
        io.emit("hrg-update", formatDataEvent('hrg-update', processedData, userId));
      } catch (error) {
        console.error("[Socket] Error processing HRG update:", error.message);
        socket.emit("hrg-update-error", formatDataEvent('error', {
          error: error.message,
          originalData: data
        }));
      }
    });

    socket.on("user-update", async (data) => {
      const currentSession = sessions.get(sessionId);
      if (!currentSession || currentSession.socketId !== socket.id) {
        console.log("[Socket] Rejected invalid user update from:", userId);
        return;
      }

      logDataUpdate('User', data, userId, socket.id);
      
      try {
        const updateData = Array.isArray(data) ? data[0] : data;
        const userData = updateData.data || updateData;

        // Structure user data according to our standard format
        const processedData = {
          // Base user info
          _id: userData._id,
          username: userData.username || "",
          status: userData.status || "Logged Off",
          lastLoginAt: userData.lastLoginAt || null,
          
          // Role information
          roles: (userData.roles || []).map(role => ({
            role: {
              _id: role.role._id,
              name: role.role.name,
              defaultPermissions: role.role.defaultPermissions || []
            },
            customPermissions: role.customPermissions || []
          })),

          // Additional metadata
          type: updateData.type || 'update',
          timestamp: Date.now()
        };

        io.emit("user-update", formatDataEvent('user-update', processedData, userId));
      } catch (error) {
        console.error("[Socket] Error processing user update:", error.message);
        socket.emit("user-update-error", formatDataEvent('error', {
          error: error.message,
          originalData: data
        }));
      }
    });

    socket.on("accounting-update", async (data) => {
      const currentSession = sessions.get(sessionId);
      if (!currentSession || currentSession.socketId !== socket.id) {
        console.log("[Socket] Rejected invalid accounting update from:", userId);
        return;
      }

      logDataUpdate('Accounting', data, userId, socket.id);
      
      try {
        const updateData = Array.isArray(data) ? data[0] : data;
        const paymentData = updateData.data || updateData;

        // Structure payment data according to our standard format
        const processedData = {
          // Payment information
          id: paymentData.id,
          clientId: paymentData.clientId,
          paymentType: paymentData.paymentType || "",
          amount: paymentData.amount || 0,
          paymentDate: paymentData.paymentDate || new Date().toISOString(),
          paymentReference: paymentData.paymentReference || "",
          paymentStatus: paymentData.paymentStatus || "pending",
          
          // Service-specific payment details
          serviceType: paymentData.serviceType || "", // WMM, HRG, FOM, CAL
          servicePeriod: {
            startDate: paymentData.servicePeriod?.startDate || null,
            endDate: paymentData.servicePeriod?.endDate || null
          },

          // Transaction metadata
          transactionId: paymentData.transactionId || "",
          processedBy: paymentData.processedBy || userId,
          processedAt: paymentData.processedAt || new Date().toISOString(),
          remarks: paymentData.remarks || "",

          // Audit information
          createdBy: paymentData.createdBy || userId,
          createdAt: paymentData.createdAt || new Date().toISOString(),
          updatedBy: paymentData.updatedBy || userId,
          updatedAt: paymentData.updatedAt || new Date().toISOString(),

          // Additional metadata
          type: updateData.type || 'update',
          timestamp: Date.now()
        };

        io.emit("accounting-update", formatDataEvent('accounting-update', processedData, userId));
      } catch (error) {
        console.error("[Socket] Error processing accounting update:", error.message);
        socket.emit("accounting-update-error", formatDataEvent('error', {
          error: error.message,
          originalData: data
        }));
      }
    });

    socket.on("payment-update", async (data) => {
      const currentSession = sessions.get(sessionId);
      if (!currentSession || currentSession.socketId !== socket.id) {
        console.log("[Socket] Rejected invalid payment update from:", userId);
        return;
      }

      logDataUpdate('Payment', data, userId, socket.id);
      
      try {
        const updateData = Array.isArray(data) ? data[0] : data;
        const paymentData = updateData.data || updateData;

        // Structure payment data according to our standard format
        const processedData = {
          // Base payment info
          id: paymentData.id,
          clientId: paymentData.clientId,
          
          // Payment details
          payments: (paymentData.payments || []).map(payment => ({
            id: payment.id,
            type: payment.type || "",
            amount: payment.amount || 0,
            date: payment.date || new Date().toISOString(),
            reference: payment.reference || "",
            status: payment.status || "pending",
            serviceType: payment.serviceType || "", // WMM, HRG, FOM, CAL
            remarks: payment.remarks || ""
          })),

          // Summary information
          totalAmount: paymentData.totalAmount || 0,
          paymentStatus: paymentData.paymentStatus || "pending",
          lastPaymentDate: paymentData.lastPaymentDate || null,

          // Audit information
          createdBy: paymentData.createdBy || userId,
          createdAt: paymentData.createdAt || new Date().toISOString(),
          updatedBy: paymentData.updatedBy || userId,
          updatedAt: paymentData.updatedAt || new Date().toISOString(),

          // Additional metadata
          type: updateData.type || 'update',
          timestamp: Date.now()
        };

        io.emit("payment-update", formatDataEvent('payment-update', processedData, userId));
      } catch (error) {
        console.error("[Socket] Error processing payment update:", error.message);
        socket.emit("payment-update-error", formatDataEvent('error', {
          error: error.message,
          originalData: data
        }));
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", {
        user: username,
        userId,
        reason,
        socketId: socket.id
      });

      const session = sessions.get(sessionId);
      if (session && session.socketId === socket.id) {
        // Set up reconnection window
        const reconnectTimeout = setTimeout(() => {
          const session = sessions.get(sessionId);
          if (session) {
            session.reconnectAttempts += 1;
            
            // If too many failed reconnects, clean up the session
            if (session.reconnectAttempts > 5) {
              global.socketIdMap.delete(userId);
              sessions.delete(sessionId);
              socket.leave(`user:${userId}`);
              socket.leave(`export:${userId}`);
              console.log("[Socket] Session expired after max reconnect attempts:", {
                user: username,
                userId
              });
            } else {
              sessions.set(sessionId, session);
            }
          }
          pendingReconnects.delete(userId);
        }, 30000); // 30 second reconnection window

        pendingReconnects.set(userId, reconnectTimeout);
      }
    });
  });

  // Periodic cleanup of stale sessions
  setInterval(() => {
    const now = Date.now();
    sessions.forEach((session, sessionId) => {
      // Consider a session stale if no ping for 2 minutes and has exceeded max reconnect attempts
      if (now - session.lastPing > 120000 && session.reconnectAttempts > 5) {
        sessions.delete(sessionId);
        global.socketIdMap.delete(session.userId);
        console.log("[Socket] Cleaned up stale session:", {
          user: session.username,
          userId: session.userId
        });
      }
    });
  }, 60000); // Run cleanup every minute
};

export default initWebSocket;
const initWebSocket = (io) => {
  const connectedClients = new Map();

  io.on("connection", (socket) => {
    // Extract user information from the socket handshake query
    const userId = socket.handshake.query.userId;
    const username = socket.handshake.query.username;

    const clientInfo = {
      id: socket.id,
      userId,
      username,
      connectTime: new Date().toISOString(),
      userAgent: socket.handshake.headers["user-agent"],
    };

    connectedClients.set(socket.id, clientInfo);

    console.log("\n=== New Client Connected ===");
    console.log(`Socket ID: ${socket.id}`);
    console.log(`User ID: ${userId}`);
    console.log(`Username: ${username}`);
    console.log(`Total Connected Clients: ${connectedClients.size}`);
    console.log("Currently Connected Clients:");
    connectedClients.forEach((client, id) => {
      console.log(`- Client ${id} (User: ${client.username}, connected at ${client.connectTime})`);
    });
    console.log("============================\n");

    socket.on("data-update", (data) => {
      console.log("\n=== Data Update Event ===");
      console.log(`From Client: ${socket.id}`);
      console.log("Data:", data);

      // Broadcast to other clients
      socket.broadcast.emit("data-update", data);

      // Log which clients will receive the broadcast
      console.log("\nBroadcasting to clients:");
      connectedClients.forEach((client, id) => {
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
      connectedClients.delete(socket.id);
      console.log("\n=== Client Disconnected ===");
      console.log(`Socket ID: ${socket.id}`);
      console.log(`Reason: ${reason}`);
      console.log(`Remaining Connected Clients: ${connectedClients.size}`);
      console.log("Currently Connected Clients:");
      connectedClients.forEach((client, id) => {
        console.log(`- Client ${id} (User: ${client.username}, connected at ${client.connectTime})`);
      });
      console.log("=========================\n");
    });
  });
};

export default initWebSocket;

const initWebSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`A user is connected: ${socket.id}`);

    socket.on("data-update", (data) => {
      console.log("Data update received", data);
    });

    socket.on("hrg-update", (data) => {
      console.log("HRG update received", data);
    });

    socket.on("user-update", (data) => {
      console.log("User update received:", data);
    });

    socket.on("disconnect", (reason) => {
      console.log(`A user is disconnected: ${socket.id}`, reason);
    });

    socket.on("error", (error) => {
      console.log("Socket error:", error);
    });
  });
};

export default initWebSocket;

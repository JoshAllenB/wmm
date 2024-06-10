import { Server } from "socket.io";

const initWebSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("A user is connected");

    socket.on("data-update", (data) => {
      console.log("Data update received", data);
    });

    socket.on("disconnect", () => {
      console.log("A user is disconnected");
    });

    setInterval(() => {
      socket.emit("ping");
    }, 5000);

    socket.on("ping", () => {
      socket.emit("pong");
    });
  });
};

export default initWebSocket;

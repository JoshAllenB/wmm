import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import userAuthRouter from "./userAuth/userAuth.mjs";
import initWebSocket from "./websocket.mjs";
import userRoutes from "./middleware/users/Users.mjs";
import clientsRoutes from "./middleware/clients/Clients.mjs";
import hrgRoutes from "./middleware/hrg/Hrg.mjs";
import wmmRoutes from "./middleware/wmm/wmm.mjs";
import roleRoutes from "./middleware/users/roleManagement.mjs";
import utilRoutes from "./middleware/fetchUtils.mjs";
import dataExportRoutes from "./middleware/dataExport/dataExport.mjs";
import clientLogsRoutes from "./middleware/users/clientLogs.mjs";
import accountingRoutes from "./middleware/accounting/api.mjs";
import donorRoute from "./middleware/donorData/api.mjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      `http://${process.env.IP_ADDRESS}:5173`,
      `http://${process.env.IP_ADDRESS}:3001`,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      `http://${process.env.IP_ADDRESS}:5173`,
      `http://${process.env.IP_ADDRESS}:3001`,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

mongoose.set("debug", false);

initWebSocket(io);

const attachIO = (req, res, next) => {
  req.io = io;
  next();
};

console.log("IP Address:", process.env.IP_ADDRESS);

app.use("/util", attachIO, utilRoutes);
app.use("/auth", attachIO, userAuthRouter);
app.use("/users", attachIO, userRoutes);
app.use("/clients", attachIO, clientsRoutes);
app.use("/hrg", attachIO, hrgRoutes);
app.use("/wmm", attachIO, wmmRoutes);
app.use("/roles", attachIO, roleRoutes);
app.use("/data-export", attachIO, dataExportRoutes);
app.use("/client-logs", attachIO, clientLogsRoutes);
app.use("/accounting", attachIO, accountingRoutes);
app.use("/donor-data", attachIO, donorRoute);

app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

const PORT = process.env.SERVER_PORT;
const IP = process.env.SERVER_IP;

server.listen(PORT, IP, () => {
  console.log(`Server is running on http://${IP}:${PORT}`);
});

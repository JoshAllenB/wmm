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
import UserModel from "./models/userControl/users.mjs";
import { Role, Permission } from "./models/userControl/role.mjs";
import userRoutes from "./middleware/users/Users.mjs";
import clientsRoutes from "./middleware/clients/Clients.mjs";
import hrgRoutes from "./middleware/hrg/Hrg.mjs";
import wmmRoutes from "./middleware/wmm/wmm.mjs";
import axios from "axios";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allow your frontend URL
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

app.use("/auth", attachIO, userAuthRouter);
app.use("/users", attachIO, userRoutes);
app.use("/clients", attachIO, clientsRoutes);
app.use("/hrg", attachIO, hrgRoutes);
app.use("/wmm", attachIO, wmmRoutes);

const PSGC_API_BASE_URL = "https://psgc.gitlab.io/api";

app.get("/api/:endpoint(*)", async (req, res) => {
  try {
    const { endpoint } = req.params;

    // Build the full URL (append '.json' if necessary)
    const finalEndpoint = endpoint.endsWith(".json")
      ? endpoint
      : `${endpoint}.json`;
    const fullUrl = `${PSGC_API_BASE_URL}/${finalEndpoint}`;

    // Make the request to the PSGC API
    const response = await axios.get(fullUrl);

    res.json(response.data); // Send the data to the frontend
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.status(500).json({ error: "An error occurred while fetching data" });
  }
});

app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
const IP = "0.0.0.0";

server.listen(PORT, IP, () => {
  console.log(`Server is running on http://${IP}:${PORT}`);
});

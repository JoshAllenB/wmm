import express from "express";
import http from "http";
import { Server } from "socket.io";
import initWebSocket from "../../websocket.mjs";
import UserModel from "../../models/users.mjs";

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allow your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

const router = express.Router();
initWebSocket(io);

router.get("/", async (req, res) => {
  const io = req.io;
  try {
    const users = await UserModel.find().select(
      "username role lastLoginAt loggedIn status"
    );
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

export default router;

import express from "express";
import http from "http";
import { Server } from "socket.io";
import initWebSocket from "../websocket.mjs";
import loginUser from "./login.mjs";
import registerUser from "./register.mjs";
import logoutUser from "./logout.mjs";
import verifyToken from "./verifyToken.mjs";

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

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const loginResult = await loginUser(username, password);

  if (loginResult.error) {
    console.error("Login error:", loginResult.error);
    res.status(401).json(loginResult);
  } else {
    res.status(200).json(loginResult);
  }
});

router.post("/register", async (req, res) => {
  const registerResult = await registerUser(req.body);
  if (registerResult.error) {
    const statusCode =
      registerResult.error === "DuplicateUsernameError" ? 409 : 400;
    res.status(statusCode).json(registerResult);
  } else {
    res.status(200).json(registerResult);
  }
});

router.post("/logout", verifyToken, async (req, res) => {
  const io = req.io;
  if (!io) {
    console.warn("Socket.io instance not found on app");
  }

  const userId = req.user.id;

  const result = await logoutUser(userId, io);

  if (result.error) {
    console.error("Logout error:", result.error);
    return res.status(400).json(result);
  }

  res.json({ message: "Logout successful", userId });
});
export default router;

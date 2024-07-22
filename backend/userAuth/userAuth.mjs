import express from "express";
import http from "http";
import { Server } from "socket.io";
import initWebSocket from "../websocket.mjs";
import loginUser from "./login.mjs";
import registerUser from "./register.mjs";
import logoutUser from "./logout.mjs";
import verifyToken from "./verifyToken.mjs";
import User from "../models/users.mjs";
import jwt from "jsonwebtoken";

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
    const expiresIn = 30;
    const token = jwt.sign(
      { userId: loginResult.user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: `${expiresIn}s`,
      }
    );

    const refreshToken = jwt.sign(
      { userId: loginResult.user._id },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );
    res.status(200).json({ ...loginResult, token, refreshToken, expiresIn });
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
  const userId = req.user.id;
  const result = await logoutUser(userId, io);

  if (result.error) {
    console.error("Logout error:", result.error);
    return res.status(400).json(result);
  }

  res.clearCookie("token");
  res.json({ message: "Logout successful", userId });
});

router.post("/verifyToken", async (req, res) => {
  const token = req.body.token;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User Not Found" });
    }
    res.json({ valid: true, user: { id: user._id, username: user.username } });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/refreshToken", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "No Refresh Token Provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User Not Found" });
    }

    const newToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET
    );
    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(401).json({ error: "Invalid Token" });
  }
});

export default router;

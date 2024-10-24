import express from "express";
import http from "http";
import { Server } from "socket.io";
import initWebSocket from "../websocket.mjs";
import loginUser from "./login.mjs";
import registerUser from "./register.mjs";
import logoutUser from "./logout.mjs";
import verifyToken from "./verifyToken.mjs";
import User from "../models/userControl/users.mjs";
import jwt from "jsonwebtoken";
import { Role, Permission } from "../models/userControl/role.mjs";

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
  console.log("Login request received for:", req.body.username);
  try {
    const loginResult = await loginUser(req.body.username, req.body.password);
    console.log("Login Result:", loginResult);

    if (loginResult.error) {
      console.error("Login error:", loginResult.error);
      return res.status(401).json({ error: loginResult.error });
    }

    const { token, user } = loginResult;

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    const response = {
      user,
      token,
      refreshToken,
      expiresIn: "1h",
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Unexpected error during login:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/register", async (req, res) => {
  console.log("Registration request received for:", req.body.username);
  try {
    const registerResult = await registerUser(req.body);
    console.log("Registration Result:", registerResult);

    if (registerResult.error) {
      console.error("Registration error:", registerResult.error);
      const statusCode =
        registerResult.error === "DuplicateUsernameError" ? 409 : 400;
      return res
        .status(statusCode)
        .json({ error: registerResult.error, message: registerResult.message });
    }

    res.status(201).json({
      message: "User registered successfully",
      user: registerResult.user,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal Server Error" });
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
    console.log("No token provided");
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).populate({
      path: "roles.role",
      model: Role,
      populate: { path: "defaultPermissions", model: Permission },
    }).populate("roles.customPermissions");

    if (!user) {
      return res.status(401).json({ error: "User Not Found" });
    }

    const rolesAndPermissions = user.roles.map(role => ({
      role: role.role.name,
      permissions: [
        ...role.role.defaultPermissions.map(p => p.name),
        ...role.customPermissions.map(p => p.name)
      ]
    }));

    res.json({
      valid: true,
      user: {
        id: user._id,
        username: user.username,
        roles: rolesAndPermissions,
      },
    });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired", expired: true });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error("Token verification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/refreshToken", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "No Refresh Token Provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User Not Found" });
    }

    const newToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(401).json({ error: "Invalid Token" });
  }
});

export default router;

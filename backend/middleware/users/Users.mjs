import express from "express";
import http from "http";
import { Server } from "socket.io";
import initWebSocket from "../../websocket.mjs";
import UserModel from "../../models/users.mjs";
import { isAdmin } from "./adminAuth.mjs";
import verifyToken from "../../userAuth/verifyToken.mjs";

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

// Fetch all user to be used in table
router.get("/", verifyToken, isAdmin, async (req, res) => {
  const io = req.io;
  try {
    const users = await UserModel.find().select(
      "username role lastLoginAt loggedIn status"
    );
    res.status(200).json(users);
    io.emit("user-update", { type: "init", data: users });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Add user
router.post("/add", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const { username, password, role } = req.body;
    const newUser = new UserModel({ username, password, role });
    await newUser.save();
    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
    io.emit("user-update", { type: "add", data: newUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user
router.put("/update/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const { username, role } = req.body;
    const updateData = { username };

    if (req.user.role === "Admin") {
      updateData.role = role;
    }

    const user = await UserModel.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User updated successfully", user });
    io.emit("user-update", {
      type: "update",
      data: { ...user.toObject(), id: user._id },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete user
router.delete("/delete/:id", verifyToken, isAdmin, async (req, res) => {
  const io = req.io;
  try {
    const user = await UserModel.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
    console.log("User deleted:", user);
    io.emit("user-update", { type: "delete", data: user });
  } catch (err) {
    console.error(err);
  }
});
export default router;

import express from "express";
import http from "http";
import { Server } from "socket.io";
import initWebSocket from "../../websocket.mjs";
import UserModel from "../../models/userControl/users.mjs";
import { Role } from "../../models/userControl/role.mjs";
import { checkRole } from "./checkRole.mjs";
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
router.get("/", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    // Find users without populating permissions
    const users = await UserModel.find()
      .select("username role lastLoginAt loggedIn status")
      .populate("role", "name description") // Only select role fields
      .lean(); // Convert documents to plain objects

    const currentUser = users.find(
      (user) => user._id.toString() === req.user._id.toString(),
    );

    res.status(200).json({
      users,
      currentUser,
    });
    io.emit("user-update", { type: "init", data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Add user
router.post("/add", verifyToken, checkRole("Admin"), async (req, res) => {
  const io = req.io;
  try {
    const { username, password, role } = req.body;
    const roleObj = await Role.findOne({ name: role });
    if (!roleObj) {
      return res.status(400).json({ error: "Role Not Found" });
    }

    const newUser = new UserModel({ username, password, role: roleObj._id });
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

    // Check if the user performing the action is an admin
    // if (req.user.role === "Admin") {
    // Find the role by name
    const roleObj = await Role.findOne({ name: role });

    // If the role is not found, return an error
    if (!roleObj) {
      return res.status(400).json({ error: "Role Not Found" });
    }

    // Assign the role ObjectId to the user's update data
    updateData.role = roleObj._id;
    // }

    // Update the user with the new role
    const user = await UserModel.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("role"); // Populate the role for the updated user

    // If the user is not found, return a 404 error
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Send the updated user back in the response
    res.json({ message: "User updated successfully", user });

    // Emit a socket event to notify others of the user update
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
router.delete("/delete/:id", verifyToken, async (req, res) => {
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

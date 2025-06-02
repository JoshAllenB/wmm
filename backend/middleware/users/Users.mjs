import express from "express";
import UserModel from "../../models/userControl/users.mjs";
import { Role } from "../../models/userControl/role.mjs";
import { checkRole } from "./checkRole.mjs";
import { verifyToken } from "../../userAuth/verifyToken.mjs";
import { isUserActive } from "../../userAuth/login.mjs";

const router = express.Router();

// Fetch all users to be used in table
router.get("/", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const users = await UserModel.find()
      .select("username roles lastLoginAt")
      .populate({
        path: "roles.role",
        populate: { path: "defaultPermissions" },
      })
      .populate("roles.customPermissions")
      .lean();

    // Add real-time status to each user
    const usersWithStatus = users.map((user) => ({
      ...user,
      status: isUserActive(user._id) ? "Active" : "Logged Off",
    }));

    const currentUser = usersWithStatus.find(
      (user) => user._id.toString() === req.user._id.toString()
    );

    res.status(200).json({
      users: usersWithStatus,
      currentUser,
    });
    io.emit("user-update", { type: "init", data: usersWithStatus });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Add user
router.post("/add", verifyToken, checkRole("Admin"), async (req, res) => {
  const io = req.io;
  try {
    const { username, password, roles } = req.body;

    // Validate roles
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new Error("At least one role must be assigned to the user");
    }

    // Create the new user
    const newUser = new UserModel({
      username,
      password,
      roles: roles.map((roleData) => {
        if (!roleData.role) {
          throw new Error("Invalid role data: role ID is missing");
        }
        return {
          role: roleData.role,
          customPermissions: roleData.customPermissions || [],
        };
      }),
    });

    // Save the new user
    await newUser.save();

    // Populate role information
    await newUser.populate({
      path: "roles.role",
      select: "name",
    });

    res.status(201).json(newUser);
    io.emit("user-update", { type: "add", data: newUser });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update user
router.put("/update/:id", verifyToken, checkRole("Admin"), async (req, res) => {
  const io = req.io;
  try {
    const { id } = req.params;
    const { username, roles } = req.body;

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.username = username;
    user.roles = roles
      .map((roleData) => {
        if (!roleData || !roleData.role) {
          console.warn("Invalid role data received:", roleData);
          return null; // or handle this case as appropriate for your application
        }
        return {
          role: roleData.role, // This should be the role ID
          customPermissions: roleData.customPermissions || [],
        };
      })
      .filter(Boolean); // Remove any null entries

    await user.save();

    res.json({ message: "User updated successfully", user });
    io.emit("user-update", { type: "update", data: user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: error.message || "Failed to update user" });
  }
});

// Delete user
router.delete(
  "/delete/id",
  verifyToken,
  checkRole("Admin"),
  async (req, res) => {
    try {
      const user = await UserModel.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User Not Found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Update user role
router.put(
  "/update/:id/role",
  verifyToken,
  checkRole("Admin"),
  async (req, res) => {
    const io = req.io;
    try {
      const { role } = req.body;
      const roleObj = await Role.findOne({ name: role });
      if (!roleObj) {
        return res.status(400).json({ error: "Role not found" });
      }

      const user = await UserModel.findByIdAndUpdate(
        req.params.id,
        { $set: { "roles.0.role": roleObj._id } },
        { new: true }
      ).populate("roles.role");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ message: "User role updated successfully", user });
      io.emit("user-update", { type: "update", data: user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  }
);

export default router;

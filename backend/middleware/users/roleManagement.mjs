import express from "express";
import { Role, Permission } from "../../models/userControl/role.mjs";
import { checkRole } from "./checkRole.mjs";
import { verifyToken } from "../../userAuth/verifyToken.mjs";

const router = express.Router();

// Get all roles
router.get("/roles", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const roles = await Role.find()
      .populate("defaultPermissions")
      .lean();

    res.status(200).json({
      roles: roles,
    });
    io.emit("role-update", { type: "init", data: roles });
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

// Get all permissions
router.get("/permissions", verifyToken, async (req, res) => {
  try {
    const permissions = await Permission.find().lean();
    res.status(200).json(permissions);
  } catch (err) {
    console.error("Error fetching permissions:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new role
router.post("/roles/add", verifyToken, checkRole("Admin"), async (req, res) => {
  const io = req.io;
  try {
    const { name, defaultPermissions, description } = req.body;
    
    // Create new role with the provided data
    const newRole = new Role({
      name,
      defaultPermissions,
      description
    });

    await newRole.save();
    
    // Populate the permissions before sending response
    await newRole.populate('defaultPermissions');
    
    res.status(201).json({
      message: "Role created successfully",
      role: newRole
    });
    io.emit("role-update", { type: "add", data: newRole });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update role
router.put("/roles/:id", verifyToken, checkRole("Admin"), async (req, res) => {
  const io = req.io;
  try {
    const { id } = req.params;
    const { name, defaultPermissions, description } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    role.name = name;
    role.description = description;
    role.defaultPermissions = defaultPermissions;

    await role.save();
    await role.populate('defaultPermissions');

    res.json({ message: "Role updated successfully", role });
    io.emit("role-update", { type: "update", data: role });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: error.message || "Failed to update role" });
  }
});

// Delete role
router.delete("/roles/:id", verifyToken, checkRole("Admin"), async (req, res) => {
  const io = req.io;
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }
    res.json({ message: "Role deleted successfully" });
    io.emit("role-update", { type: "delete", data: { _id: req.params.id } });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

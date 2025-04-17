import express from "express";
import { Role, Permission } from "../../models/userControl/role.mjs";
import { checkRole } from "./checkRole.mjs";
import { verifyToken } from "../../userAuth/verifyToken.mjs";

const router = express.Router();

// Get all roles
router.get("/roles", verifyToken, async (req, res) => {
  try {
    const roles = await Role.find().populate("defaultPermissions");
    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all permissions
router.get("/permissions", verifyToken, async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new role
router.post("/roles/add", verifyToken, checkRole("Admin"), async (req, res) => {
  try {
    const { name, permissions, description } = req.body;
    const permissionIds = await Permission.find({
      name: { $in: permissions },
    }).distinct("_id");
    const newRole = new Role({ name, permissions: permissionIds, description });
    await newRole.save();
    res
      .status(201)
      .json({ message: "Role created successfully", role: newRole });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create a new permission
router.post(
  "/permissions/add",
  verifyToken,
  checkRole("Admin"),
  async (req, res) => {
    try {
      const { name, description } = req.body;
      const newPermission = new Permission({ name, description });
      await newPermission.save();
      res.status(201).json({
        message: "Permission created successfully",
        permission: newPermission,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Update role permissions
router.put(
  "/roles/:roleId/permissions",
  verifyToken,
  checkRole("Admin"),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const { permissions } = req.body;

      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      const permissionIds = await Permission.find({
        name: { $in: permissions },
      }).distinct("_id");
      role.permissions = permissionIds;

      await role.save();
      res.json({ message: "Role permissions updated", role });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  "/roles/:roleId",
  verifyToken,
  checkRole("Admin"),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      await Role.findByIdAndDelete(roleId);
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  "/permissions/:permissionId",
  verifyToken,
  checkRole("Admin"),
  async (req, res) => {
    try {
      const { permissionId } = req.params;
      await Permission.findByIdAndDelete(permissionId);
      await Role.updateMany(
        { permissions: permissionId },
        { $pull: { permissions: permissionId } }
      );
      res.json({ message: "Permission deleted successfully" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;

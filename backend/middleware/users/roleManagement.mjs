import express from "express";
import { Role, Permission } from "../../models/userControl/role.mjs";
import verifyToken from "../../userAuth/verifyToken.mjs";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Interval Server Error" });
  }
});

router.post("/add", verifyToken, async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const rolePermissions = await Permission.find({
      name: { $in: permissions },
    });
    const role = new Role({
      name,
      permissions: rolePermissions.map((p) => p._id),
    });
    await role.save();
    res.status(201).json({ message: "Role Created Successfully", role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/update/:id", verifyToken, async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const rolePermissions = await Permission.find({
      name: { $in: permissions },
    });
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { name, permissoins: rolePermissions.map((p) => p._id) },
      { new: true },
    );
    if (!role) {
      return res.status(404).json({ error: "Role Not Found" });
    }
    res.json({ message: "Role updated successfully", role });
  } catch (err) {
    res.status(400).json({ err: err.message });
  }
});

router.delete("/delete/:id", verifyToken, async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) {
      return res.status(404).json({ error: "Role Not Found" });
    }
    res.json({ message: "Role deleted successfully" });
  } catch (err) {
    res.status(400).json({ err: err.message });
  }
});

export default router;

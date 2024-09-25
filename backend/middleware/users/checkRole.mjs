import jwt from "jsonwebtoken";
import UserModel from "../../models/userControl/users.mjs";
import { Role } from "../../models/userControl/role.mjs";

export const checkRole = (requiredRole) => async (req, res, next) => {
  try {
    // Find user and populate the role field
    const user = await UserModel.findById(req.user.id).populate("role");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user's role matches the required role
    if (!requiredRole.includes(user.role.name)) {
      return res.status(403).json({ error: "Access Denied" });
    }

    // Proceed if the role matches
    next();
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

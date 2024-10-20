import jwt from "jsonwebtoken";
import UserModel from "../../models/userControl/users.mjs";
import { Role } from "../../models/userControl/role.mjs";

export const checkPermission = (requiredPermission) => async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id)
      .populate({
        path: "roles.role",
        populate: { path: "permissions" },
      })
      .populate("roles.customPermissions");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const hasPermission = user.roles.some(role => 
      role.role.permissions.some(p => p.name === requiredPermission) ||
      role.customPermissions.some(p => p.name === requiredPermission)
    );

    if (!hasPermission) {
      return res.status(403).json({ error: "Access Denied" });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

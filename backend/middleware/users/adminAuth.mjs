import jwt from "jsonwebtoken";
import UserModel from "../../models/userControl/users.mjs";
import { Role } from "../../models/userControl/role.mjs";

export const checkPermission =
  (requiredPermission) => async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.user.id).populate({
        path: "role",
        populate: { path: "permissions" },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (
        !user.role.permissions.some(
          (permission) => permission.name === requiredPermission,
        )
      ) {
        return res.status(403).json({ error: "Access Denied" });
      }

      next();
    } catch (err) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };

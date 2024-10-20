import jwt from "jsonwebtoken";
import UserModel from "../../models/userControl/users.mjs";
import { Role } from "../../models/userControl/role.mjs";

export const checkRole = (requiredRoles) => async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id)
      .populate({
        path: "roles.role",
        populate: { path: "defaultPermissions" },
      })
      .populate("roles.customPermissions");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const hasRequiredRole = user.roles.some(roleObj => 
      requiredRoles.includes(roleObj.role.name)
    );

    if (!hasRequiredRole) {
      return res.status(403).json({ error: "Access Denied" });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

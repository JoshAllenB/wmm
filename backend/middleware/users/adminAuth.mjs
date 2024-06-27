import jwt from "jsonwebtoken";
import UserModel from "../../models/users.mjs";

export const isAdmin = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (user.role !== "Admin") {
      return res.status(403).json({ error: "Access Denied" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

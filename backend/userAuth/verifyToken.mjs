import jwt from "jsonwebtoken";
import User from "../models/userControl/users.mjs";

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1] || req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    const user = await User.findById(decoded.userId).populate({
      path: 'roles.role',
      populate: { path: 'defaultPermissions' }
    }).populate('roles.customPermissions');
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired", expired: true });
    }
    console.error("Token verification error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default verifyToken;

import jwt from "jsonwebtoken";
import http from "http";
import { Server } from "socket.io";
import UserModel from "../models/userControl/users.mjs";
import { Permission } from "../models/userControl/role.mjs";
import bcrypt from "bcrypt";

const generateToken = (userId, roles) => {
  return jwt.sign({ userId, roles }, process.env.JWT_SECRET, {
    expiresIn: "30min",
  });
};

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allow your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

const loginUser = async (username, password) => {
  try {
    const user = await UserModel.findOne({ username }).populate({
      path: "roles.role",
      populate: { path: "defaultPermissions" }
    }).populate("roles.customPermissions");

    if (!user) {
      return { error: "User not found" };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { error: "Invalid credentials" };
    }

    user.status = "Active";
    user.lastLoginAt = new Date();
    await user.save();

    io.emit("user_status_change", { userId: user._id, status: "Active" });

    const rolesAndPermissions = user.roles.map(role => ({
      role: role.role.name,
      permissions: [
        ...role.role.defaultPermissions.map(p => p.name),
        ...role.customPermissions.map(p => p.name)
      ]
    }));

    const token = generateToken(user._id, rolesAndPermissions);

    return {
      user: {
        id: user._id,
        username: user.username,
        roles: rolesAndPermissions,
        status: user.status,
      },
      token,
    };
  } catch (error) {
    console.error("Error during login process:", error);
    return { error: "Internal Server Error" };
  }
};

export default loginUser;

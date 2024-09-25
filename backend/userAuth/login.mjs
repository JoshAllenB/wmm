import jwt from "jsonwebtoken";
import http from "http";
import { Server } from "socket.io";
import UserModel from "../models/userControl/users.mjs";
import { Permission } from "../models/userControl/role.mjs";

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
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
      path: "role",
      populate: {
        path: "permissions",
      },
    });
    if (!user) {
      console.log("User not found");
      return { error: "Invalid username or password" };
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return { error: "Invalid username or password" };
    }

    user.status = "Active";
    user.lastLoginAt = new Date();
    await user.save();

    io.emit("user_status_change", { userId: user._id, status: "Active" });

    const token = generateToken(user._id);

    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
    };
  } catch (err) {
    console.error("Error during login process:", err);
    return { error: "Internal Server Error" };
  }
};

export default loginUser;

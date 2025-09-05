import express from "express";
import loginUser from "./login.mjs";
import registerUser from "./register.mjs";
import logoutUser from "./logout.mjs";
import { verifyToken } from "./verifyToken.mjs";
import User from "../models/userControl/users.mjs";
import jwt from "jsonwebtoken";
import { Role, Permission } from "../models/userControl/role.mjs";
import { isUserActive } from "./login.mjs";

const router = express.Router();

router.post("/login", async (req, res) => {
  console.log("Login request received for:", req.body.username);
  try {
    const loginResult = await loginUser(req.body.username, req.body.password);
    console.log("Login Result:", loginResult);

    if (loginResult.error) {
      console.error("Login error:", loginResult.error);

      // Handle specific error types with appropriate status codes
      if (loginResult.error === "Account locked") {
        return res.status(429).json({
          error: loginResult.error,
          message: loginResult.message,
        });
      } else if (loginResult.error === "Invalid credentials") {
        return res.status(401).json({
          error: loginResult.error,
          message: "Username or password is incorrect.",
        });
      } else if (loginResult.error === "User already logged in") {
        return res.status(403).json({
          error: loginResult.error,
          message: "Your account is already logged in on another device.",
        });
      } else {
        return res.status(401).json({
          error: loginResult.error,
          message: loginResult.message || "Authentication failed.",
        });
      }
    }

    const { token, user } = loginResult;

    // Make sure user status is updated to real-time status (should be Active after login)
    user.status = isUserActive(user.id) ? "Active" : "Logged Off";

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    const response = {
      user,
      token,
      refreshToken,
      expiresIn: "30min", // Match actual JWT expiration
      tokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Unexpected error during login:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred during login.",
    });
  }
});

router.post("/register", async (req, res) => {
  console.log("Registration request received for:", req.body.username);
  try {
    const registerResult = await registerUser(req.body);

    if (registerResult.error) {
      console.error("Registration error:", registerResult.error);
      const statusCode =
        registerResult.error === "DuplicateUsernameError" ? 409 : 400;
      return res
        .status(statusCode)
        .json({ error: registerResult.error, message: registerResult.message });
    }

    res.status(201).json({
      message: "User registered successfully",
      user: registerResult.user,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/logout", verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.cookies.token;
    const logoutResult = await logoutUser(req.userId, token, req.io);

    if (logoutResult.error) {
      return res.status(400).json({ error: logoutResult.error });
    }

    res.status(200).json({ message: logoutResult.message });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/verifyToken", async (req, res) => {
  const token = req.body.token;

  if (!token) {
    return res.status(401).json({
      error: "No token provided",
      message: "Authentication token is missing.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .populate({
        path: "roles.role",
        model: Role,
        populate: { path: "defaultPermissions", model: Permission },
      })
      .populate("roles.customPermissions");

    if (!user) {
      return res.status(401).json({
        error: "User Not Found",
        message: "The user associated with this token no longer exists.",
      });
    }

    const rolesAndPermissions = user.roles.map((role) => ({
      role: role.role.name,
      permissions: [
        ...role.role.defaultPermissions.map((p) => p.name),
        ...role.customPermissions.map((p) => p.name),
      ],
    }));

    // Use isUserActive function to determine real-time status
    const userStatus = isUserActive(user._id) ? "Active" : "Logged Off";

    res.json({
      valid: true,
      user: {
        id: user._id,
        username: user.username,
        roles: rolesAndPermissions,
        status: userStatus, // Return the real-time status
      },
    });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: "Token expired",
        expired: true,
        message: "Your session has expired. Please log in again.",
      });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: "Invalid token",
        message: "Your authentication token is invalid.",
      });
    }
    console.error("Token verification error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "An unexpected error occurred while verifying your session.",
    });
  }
});

router.post("/refreshToken", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({
      error: "No Refresh Token Provided",
      message: "Refresh token is required to get a new access token.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: "User Not Found",
        message: "The user associated with this token no longer exists.",
      });
    }

    const newToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn: "30min",
      tokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error("Token refresh error:", err);

    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: "Refresh Token Expired",
        message: "Your refresh token has expired. Please log in again.",
      });
    } else if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: "Invalid Refresh Token",
        message: "Your refresh token is invalid.",
      });
    } else {
      res.status(401).json({
        error: "Authentication Failed",
        message: "Failed to refresh your session.",
      });
    }
  }
});

export default router;

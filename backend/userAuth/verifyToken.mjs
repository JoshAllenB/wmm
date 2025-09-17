import jwt from "jsonwebtoken";
import User from "../models/userControl/users.mjs";
import { activeSessions, isUserActive } from "./login.mjs";
import { logTokenEvent } from "./tokenLogger.mjs";

// Track revoked tokens
const revokedTokens = new Set();

// Track session restoration to prevent excessive logging
const sessionRestorationLogs = new Map();

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Check if token is in the revoked list
    if (revokedTokens.has(token)) {
      return res.status(401).json({ error: "Token has been revoked" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"], // Explicitly specify allowed algorithms
    });

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return res.status(401).json({ error: "Token expired", expired: true });
    }

    // Check token issuance time (iat)
    if (decoded.iat > now) {
      return res.status(401).json({ error: "Invalid token issuance time" });
    }

    req.userId = decoded.userId;
    const user = await User.findById(decoded.userId)
      .populate({
        path: "roles.role",
        populate: { path: "defaultPermissions" },
      })
      .populate("roles.customPermissions");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check if session exists and restore it if needed
    if (decoded.jti && activeSessions.has(decoded.jti)) {
      // Update the last activity time for this session if it exists
      const session = activeSessions.get(decoded.jti);
      if (session) {
        session.lastActivity = new Date();
      }
    } else if (decoded.jti) {
      // Restore session for valid tokens (browser refresh scenario)
      // This is safe because we've already validated the token
      activeSessions.set(decoded.jti, {
        userId: decoded.userId,
        username: user.username,
        loginTime: new Date(),
        lastActivity: new Date(),
      });

      // Rate limit session restoration logs to prevent spam
      const now = Date.now();
      const lastLogTime = sessionRestorationLogs.get(decoded.jti) || 0;
      if (now - lastLogTime > 30000) {
        // Only log once every 30 seconds per session
        console.log(
          `Session restored for user ${user.username} after browser refresh`
        );
        sessionRestorationLogs.set(decoded.jti, now);
      }
    }

    // Check if user is explicitly disabled or deleted
    if (user.status === "Disabled" || user.status === "Deleted") {
      return res.status(401).json({ error: "User account is disabled" });
    }

    req.user = user;
    logTokenEvent({
      action: "VERIFY_OK",
      userId: user._id.toString(),
      username: user.username,
      token,
      meta: {},
    });
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      logTokenEvent({ action: "VERIFY_EXPIRED", token, meta: {} });
      return res.status(401).json({ error: "Token expired", expired: true });
    } else if (err.name === "JsonWebTokenError") {
      logTokenEvent({ action: "VERIFY_INVALID", token, meta: {} });
      return res.status(401).json({ error: "Invalid token" });
    } else if (err.name === "NotBeforeError") {
      return res.status(401).json({ error: "Token not active yet" });
    }
    console.error("Token verification error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Function to revoke a token (can be used during logout)
const revokeToken = (token) => {
  revokedTokens.add(token);

  // If possible, also remove from active sessions
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.jti) {
      activeSessions.delete(decoded.jti);
    }
  } catch (error) {
    console.error("Error decoding token during revocation:", error);
  }

  // Clean up old revoked tokens periodically
  // This is a simple implementation - in production, you might want to use Redis or a database
  if (revokedTokens.size > 1000) {
    // Keep only the most recent 1000 revoked tokens
    const tokensArray = Array.from(revokedTokens);
    revokedTokens.clear();
    tokensArray.slice(-1000).forEach((t) => revokedTokens.add(t));
  }
};

export { verifyToken, revokeToken };

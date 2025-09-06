import jwt from "jsonwebtoken";
import UserModel from "../models/userControl/users.mjs";
import { Permission } from "../models/userControl/role.mjs";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Track login attempts to prevent brute force attacks
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

// Track active sessions (in-memory, resets on server restart)
const activeSessions = new Map();
// const SESSION_TIMEOUT = 1 * 60 * 60 * 1000; // Removed: No periodic purge

const generateToken = (userId, roles) => {
  // Add more claims to the token for better security
  const sessionId = crypto.randomUUID();

  return jwt.sign(
    {
      userId,
      roles,
      iat: Math.floor(Date.now() / 1000),
      jti: sessionId, // Use the session ID as the JWT ID
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30min",
      algorithm: "HS256", // Explicitly specify the algorithm
    }
  );
};

/**
 * Checks if a user is currently active based on active sessions
 * @param {string} userId - The user ID to check
 * @returns {boolean} - Whether the user is currently active
 */
const isUserActive = (userId) => {
  if (!userId) return false;

  // Check if user has any active sessions
  for (const session of activeSessions.values()) {
    if (session.userId === userId.toString()) {
      return true;
    }
  }

  return false;
};

const loginUser = async (username, password) => {
  try {
    // Check if user is locked out
    const userAttempts = loginAttempts.get(username);
    if (userAttempts && userAttempts.count >= MAX_LOGIN_ATTEMPTS) {
      const timeLeft = userAttempts.lockoutEnd - Date.now();
      if (timeLeft > 0) {
        return {
          error: "Account locked",
          message: `Account is locked. Try again in ${Math.ceil(
            timeLeft / 60000
          )} minutes.`,
        };
      } else {
        // Reset attempts if lockout period has expired
        loginAttempts.delete(username);
      }
    }

    const user = await UserModel.findOne({ username })
      .populate({
        path: "roles.role",
        populate: { path: "defaultPermissions" },
      })
      .populate("roles.customPermissions");

    if (!user) {
      // Track failed login attempt
      const attempts = loginAttempts.get(username) || {
        count: 0,
        lockoutEnd: 0,
      };
      attempts.count += 1;

      if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        attempts.lockoutEnd = Date.now() + LOCKOUT_TIME;
      }

      loginAttempts.set(username, attempts);

      return { error: "Invalid credentials" }; // Generic message for security
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Track failed login attempt
      const attempts = loginAttempts.get(username) || {
        count: 0,
        lockoutEnd: 0,
      };
      attempts.count += 1;

      if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        attempts.lockoutEnd = Date.now() + LOCKOUT_TIME;
      }

      loginAttempts.set(username, attempts);

      return { error: "Invalid credentials" }; // Generic message for security
    }

    // Reset login attempts on successful login
    loginAttempts.delete(username);

    // Update only the lastLoginAt timestamp, don't store status in DB
    user.lastLoginAt = new Date();
    await user.save();

    const rolesAndPermissions = user.roles.map((role) => ({
      role: role.role.name,
      permissions: [
        ...role.role.defaultPermissions.map((p) => p.name),
        ...role.customPermissions.map((p) => p.name),
      ],
    }));

    // Generate token with unique session ID
    const token = generateToken(user._id, rolesAndPermissions);

    // Extract the session ID from the token
    const decoded = jwt.decode(token);
    const sessionId = decoded.jti;

    // Store session information
    activeSessions.set(sessionId, {
      userId: user._id.toString(),
      username: user.username,
      loginTime: new Date(),
      lastActivity: new Date(),
    });

    return {
      user: {
        id: user._id,
        username: user.username,
        roles: rolesAndPermissions,
        status: "Active", // Status is Active at login time
      },
      token,
    };
  } catch (error) {
    console.error("Error during login process:", error);
    return { error: "Internal Server Error" };
  }
};

/**
 * Resets all active sessions on server startup.
 * This should be run once on server startup to clean up stale sessions after a restart.
 */
const resetActiveUsersStatus = async () => {
  try {
    // Clear all active sessions
    activeSessions.clear();
  } catch (error) {
    console.error("Error during startup session cleanup:", error);
  }
};

// Export the active sessions map and the reset function
export { activeSessions, resetActiveUsersStatus, isUserActive, generateToken };
export default loginUser;

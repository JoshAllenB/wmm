import jwt from "jsonwebtoken";
import UserModel from "../models/userControl/users.mjs";
import { Permission } from "../models/userControl/role.mjs";
import bcrypt from "bcrypt";

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

    // Update user status to active and track session
    user.status = "Active";
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
        status: user.status,
      },
      token,
    };
  } catch (error) {
    console.error("Error during login process:", error);
    return { error: "Internal Server Error" };
  }
};

/**
 * Resets the status of all users marked as "Active" in the database to "Logged Off".
 * This should be run once on server startup to clean up stale statuses after a restart.
 */
const resetActiveUsersStatus = async () => {
  try {
    console.log(
      'Running startup cleanup: Resetting "Active" user statuses to "Logged Off"...'
    );
    const result = await UserModel.updateMany(
      { status: "Active" },
      { $set: { status: "Logged Off" } }
    );
    console.log(
      `Startup cleanup finished. Reset status for ${result.modifiedCount} user(s).`
    );
  } catch (error) {
    console.error("Error during startup user status cleanup:", error);
    // Depending on the desired behavior, you might want to throw the error
    // to prevent the server from starting if the cleanup fails.
    // throw error;
  }
};

// Export the active sessions map and the reset function
export { activeSessions, resetActiveUsersStatus };
export default loginUser;

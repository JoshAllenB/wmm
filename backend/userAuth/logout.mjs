import UserModel from "../models/userControl/users.mjs";
import { revokeToken } from "./verifyToken.mjs";
import { activeSessions } from "./login.mjs";
import jwt from "jsonwebtoken";

const logoutUser = async (userId, token, io) => {
  try {
    // Revoke the token
    if (token) {
      revokeToken(token);

      // Remove from active sessions if exists
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.jti) {
          activeSessions.delete(decoded.jti);
        }
      } catch (decodeError) {
        console.error("Error decoding token during logout:", decodeError);
      }
    }

    // Count remaining active sessions for this user
    const hasOtherActiveSessions = Array.from(activeSessions.values()).some(
      (session) => session.userId === userId.toString()
    );

    return {
      message: "Logout successful",
      status: hasOtherActiveSessions ? "Active" : "Logged Off",
    };
  } catch (error) {
    console.error(error);
    return { error: "Internal Server Error" };
  }
};

export default logoutUser;

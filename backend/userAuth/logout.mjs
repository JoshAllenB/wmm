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

    const user = await UserModel.findById(userId);
    if (user) {
      // Only set to Logged Off if no other active sessions for this user
      const hasOtherActiveSessions = Array.from(activeSessions.values()).some(
        (session) => session.userId === userId.toString()
      );

      if (!hasOtherActiveSessions) {
        user.status = "Logged Off";
        await user.save();
      }

      return { message: "Logout successful" };
    } else {
      return { error: "User not found" };
    }
  } catch (error) {
    console.error(error);
    return { error: "Internal Server Error" };
  }
};

export default logoutUser;

import UserModel from "../models/users.mjs";

const logoutUser = async (userId, io) => {
  try {
    const user = await UserModel.findById(userId);
    if (user) {
      user.status.status = "Logged Off";
      await user.save();

      // Emit a socket event to notify all clients about the user's status change
      io.emit("user_status_change", { userId, status: "Logged Off" });

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

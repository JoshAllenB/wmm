import UserModel from "../models/userControl/users.mjs";

const logoutUser = async (userId, io) => {
  try {
    const user = await UserModel.findById(userId);
    if (user) {
      user.status = "Logged Off";
      await user.save();

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

import UserModel from "../models/userControl/users.mjs";
import { Role } from "../models/userControl/role.mjs";

const registerUser = async (userData) => {
  try {
    const existingUser = await UserModel.findOne({
      username: userData.username,
    });
    if (existingUser) {
      return {
        error: "DuplicateUsernameError",
        message: "Username already taken",
      };
    }

    const user = await UserModel.create(userData);
    await user.save();
    return { user };
  } catch (err) {
    return err.name === "ValidationError"
      ? { error: "ValidationError", message: err.message }
      : { error: "RegistrationFailedError", message: err.message };
  }
};

export default registerUser;

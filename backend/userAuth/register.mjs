import UserModel from "../models/users.mjs";

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

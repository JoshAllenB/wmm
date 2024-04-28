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
    return { user };
  } catch (err) {
    if (err.name === "ValidationError") {
      return { error: "ValidationError", message: err.message };
    } else {
      return { error: "RegistrationFailedError", message: err.message };
    }
  }
};

export default registerUser;

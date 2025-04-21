import UserModel from "../models/userControl/users.mjs";

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
    const newUser = new UserModel({
      username: userData.username,
      email: userData.email,
      password: userData.password, // This will be hashed by the pre-save middleware
    });
    await newUser.save();
    return {
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        status: "Inactive", // Default status for new users until they log in
      },
    };
  } catch (err) {
    console.error("Error during registration process:", err);
    return { error: "RegistrationFailedError", message: err.message };
  }
};

export default registerUser;

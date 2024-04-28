import jwt from "jsonwebtoken";
import UserModel from "../models/users.mjs";

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

const loginUser = async (username, password) => {
  try {
    const user = await UserModel.findOne({ username });

    if (!user) {
      return { error: "Username does not exist" };
    }

    if (!user.authenticate(password)) {
      return { error: "Password Incorrect" };
    }

    const token = generateToken(user._id);

    return { token };
  } catch (err) {
    console.error(err);
    return { error: "Internal Server Error" };
  }
};

export default loginUser;

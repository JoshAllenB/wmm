// user.mjs
import mongoose from "mongoose";

// Create a new connection for the "wmm_user" database
const userConnection = mongoose.createConnection(
  "mongodb://127.0.0.1:27017/wmm_user"
);

const UsersSchema = new mongoose.Schema(
  {
    username: String,
    password: String,
  },
  {
    versionKey: false,
  }
);

const UserModel = userConnection.model("users", UsersSchema);

export default UserModel;

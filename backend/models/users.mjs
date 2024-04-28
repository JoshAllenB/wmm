// user.mjs
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto"; // Import the crypto module

// Create a new connection for the "wmm_user" database
const userConnection = mongoose.createConnection(
  "mongodb://127.0.0.1:27017/wmm_user"
);

const UsersSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    encrypted_password: {
      type: String,
      required: true,
    },
    salt: String,
    lastLoginAt: Date,
    loggedIn: Boolean,
  },
  { timestamps: true }
);

UsersSchema.virtual("password")
  .set(function (password) {
    this._password = password;
    this.salt = uuidv4();
    this.encrypted_password = this.securePassword(password);
  })
  .get(function () {
    return this._password;
  });

UsersSchema.methods = {
  authenticate(plainpassword) {
    return this.securePassword(plainpassword) === this.encrypted_password;
  },

  securePassword(plainpassword) {
    if (!plainpassword) return "";
    try {
      return crypto
        .createHmac("sha256", this.salt)
        .update(plainpassword)
        .digest("hex");
    } catch (err) {
      return "error in hashing the password";
    }
  },
};

const UserModel = userConnection.model("users", UsersSchema);

export default UserModel;

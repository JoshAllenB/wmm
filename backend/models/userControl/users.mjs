import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import dbConnection from "../dbConnect.mjs";

const UsersSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    roles: [
      {
        role: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "roles",
        },
        customPermissions: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "permissions",
          },
        ],
      },
    ],
    lastLoginAt: Date,
    status: {
      type: String,
      enum: ["Active", "Inactive", "Logged Off"],
      default: "Inactive",
    },
  },
  { timestamps: true, collection: "users" }
);

UsersSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const UserModel = dbConnection.model("users", UsersSchema);

export default UserModel;

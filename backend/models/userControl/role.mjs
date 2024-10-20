import dbConnection from "../dbConnect.mjs";
import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true },
    description: String,
  },
  { collection: "permissions" }
);

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    defaultPermissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "permissions",
      },
    ],
    description: String,
  },
  { collection: "roles" }
);

const Permission = dbConnection.model("permissions", permissionSchema);
const Role = dbConnection.model("roles", roleSchema);

export { Permission, Role };

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const clientConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

const GroupSchema = new mongoose.Schema(
  {
    id: Number,
    name: String,
    description: String,
  },
  {
    versionKey: false,
  }
);

const GroupModel = clientConnection.model("groups", GroupSchema);

export default GroupModel;

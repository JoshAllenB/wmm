import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const typesConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

const TypesSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    description: String,
  },
  {
    versionKey: false,
  }
);

const TypesModel = typesConnection.model("Types", TypesSchema, "types");

export default TypesModel;

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Create a dedicated connection with explicit options to avoid Mongoose errors
const labelConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});


const LabelSchema = new mongoose.Schema(
  {
    id: String,
    description: String,
    left: Number,
    width: Number,
    height: Number,
    columns: Number,
    init: { type: String, alias: 'initCommand' },
    format: { type: String, alias: 'formatStr' },
    reset: { type: String, alias: 'resetCommand' },
    type: String,
    printer: String,
  },
  {
    versionKey: false,
    collection: 'labels'  // Explicitly set collection name
  }
);

const LabelModel = labelConnection.model("labels", LabelSchema);


export default LabelModel;

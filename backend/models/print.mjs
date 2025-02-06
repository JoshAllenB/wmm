import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const printConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

const layoutSchema = new mongoose.Schema({
  fontSize: { type: Number, required: true, default: 12 },
  leftPosition: { type: Number, required: true, default: 10 },
  topPosition: { type: Number, required: true, default: 10 },
  columnWidth: { type: Number, required: true, default: 300 },
});

const printLabelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  layout: { type: layoutSchema, required: true },
  selectedFields: [{ type: String, required: true }],
  createdAt: { type: Date, default: Date.now },
});

const PrintLabelModel = printConnection.model("printlabel", printLabelSchema);

export default PrintLabelModel;

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const printConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

// Use a flexible layout type so we only persist fields provided by the client
// This prevents unrelated defaults (e.g., label or thank-you settings) from
// being injected into renewal templates which only need `{ positions }`.
const flexibleLayoutType = mongoose.Schema.Types.Mixed;

const printLabelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  department: { type: String, required: true }, // Department = role
  layout: { type: flexibleLayoutType, required: true },
  selectedFields: [{ type: String, required: true }],
  previewType: {
    type: String,
    enum: ["standard", "renewal", "thankyou"],
    default: "standard",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create compound index for name and department to allow same name in different departments
printLabelSchema.index({ name: 1, department: 1 }, { unique: true });

const PrintLabelModel = printConnection.model("printlabel", printLabelSchema);

export default PrintLabelModel;

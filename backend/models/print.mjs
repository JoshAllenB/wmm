import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const printConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

const layoutSchema = new mongoose.Schema({
  // Standard mailing label settings
  fontSize: { type: Number, required: true, default: 12 },
  leftPosition: { type: Number, required: true, default: 10 },
  topPosition: { type: Number, required: true, default: 10 },
  columnWidth: { type: Number, required: true, default: 300 },
  labelHeight: { type: Number, default: 100 },
  horizontalSpacing: { type: Number, default: 20 },

  // Renewal notice settings
  renewalFontSize: { type: Number, default: 14 },
  renewalLeftMargin: { type: Number, default: 40 },
  renewalTopMargin: { type: Number, default: 40 },
  renewalRightColumnPosition: { type: Number, default: 400 },
  leftColumnLineSpacing: { type: Number, default: 8 },
  rightColumnLineSpacing: { type: Number, default: 12 },
  nameAddressSpacing: { type: Number, default: 24 },
  addressContactSpacing: { type: Number, default: 30 },
  rightColumnItemSpacing: { type: Number, default: 16 },
  lineSpacing: { type: Number, default: 8 },

  // Thank You Letter settings
  thankYouFontSize: { type: Number, default: 14 },
  thankYouTopMargin: { type: Number, default: 60 },
  thankYouLeftMargin: { type: Number, default: 60 },
  thankYouLineSpacing: { type: Number, default: 16 },
  thankYouWidth: { type: Number, default: 400 },
  thankYouDateSpacing: { type: Number, default: 40 },
  thankYouGreetingSpacing: { type: Number, default: 30 },
  thankYouContentSpacing: { type: Number, default: 20 },
});

const printLabelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  layout: { type: layoutSchema, required: true },
  selectedFields: [{ type: String, required: true }],
  previewType: {
    type: String,
    enum: ["standard", "renewal", "thankyou"],
    default: "standard",
  },
  createdAt: { type: Date, default: Date.now },
});

const PrintLabelModel = printConnection.model("printlabel", printLabelSchema);

export default PrintLabelModel;

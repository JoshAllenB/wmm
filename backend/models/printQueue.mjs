import mongoose from "mongoose";
import dbConnection from "./dbConnect.mjs";

const PrintQueueSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Untitled Queue" },
    ownerUserId: { type: String, index: true, required: true },
    department: { type: String, index: true },
    visibility: { type: String, enum: ["user", "department"], default: "user" },
    actionType: {
      type: String,
      enum: ["label", "document", "csv"],
      default: "label",
    },
    templateRefId: { type: String },
    status: {
      type: String,
      enum: ["open", "locked", "completed", "archived"],
      default: "open",
    },
    sources: [
      {
        sourceType: {
          type: String,
          enum: ["selection", "filter"],
          required: true,
        },
        filterSnapshot: { type: Object },
        filterSignatureHash: { type: String },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    versionKey: false,
  }
);

const PrintQueueModel = dbConnection.model("print_queues", PrintQueueSchema);

export default PrintQueueModel;

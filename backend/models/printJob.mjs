import mongoose from "mongoose";
import dbConnection from "./dbConnect.mjs";

const PrintJobSchema = new mongoose.Schema(
  {
    queueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "print_queues",
      required: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    department: { type: String, index: true },
    actionType: {
      type: String,
      enum: ["label", "document", "csv"],
      required: true,
    },
    templateRefId: { type: String },
    printerName: { type: String },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    counts: {
      total: { type: Number, default: 0 },
      processed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
    },
    clientIds: [{ type: String }], // Store sample of client IDs for reference
    errors: [{ type: String }],
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    processingTime: { type: Number }, // in milliseconds
    mode: { type: String, enum: ["freeze", "re-evaluate"], default: "freeze" },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    versionKey: false,
  }
);

// TTL index for auto-cleanup after 90 days
PrintJobSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

const PrintJobModel = dbConnection.model("print_jobs", PrintJobSchema);

export default PrintJobModel;

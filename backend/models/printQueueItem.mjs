import mongoose from "mongoose";
import dbConnection from "./dbConnect.mjs";

const PrintQueueItemSchema = new mongoose.Schema(
  {
    queueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "print_queues",
      index: true,
      required: true,
    },
    clientId: { type: String, index: true, required: true },
    addedBy: { type: String },
    addedAt: { type: Date, default: Date.now },
    printedAt: { type: Date },
    printedBy: { type: String },
    printJobId: { type: mongoose.Schema.Types.ObjectId, ref: "print_jobs" },
  },
  { versionKey: false }
);

// Ensure uniqueness of clientId per queue
PrintQueueItemSchema.index({ queueId: 1, clientId: 1 }, { unique: true });

const PrintQueueItemModel = dbConnection.model(
  "print_queue_items",
  PrintQueueItemSchema
);

export default PrintQueueItemModel;

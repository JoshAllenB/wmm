import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fomConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

const FomSchema = new mongoose.Schema(
  {
    id: Number,
    clientid: Number,
    recvdate: String,
    paymtref: String,
    paymtform: String,
    remarks: String,
    paymtamt: Number,
    unsubscribe: Boolean,
    adddate: String,
    adduser: String,
    editdate: Date,
    edituser: String,
  },
  {
    versionKey: false,
    collection: "fom",
  },
);

// Add index on clientid for faster lookups
FomSchema.index({ clientid: 1 });
FomSchema.index({ recvdate: -1 });

const FomModel = fomConnection.model("fom", FomSchema);

export default FomModel;

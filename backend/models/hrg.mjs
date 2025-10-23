import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const hrgConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

const HrgSchema = new mongoose.Schema(
  {
    id: Number,
    clientid: Number,
    recvdate: String,
    renewdate: String,
    campaigndate: String,
    paymtref: String,
    paymtamt: Number,
    paymtform: String,
    remarks: String,
    unsubscribe: Boolean,
    adddate: String,
    adduser: String,
    editdate: Date,
    edituser: String,
  },
  {
    versionKey: false,
    collection: "hrg",
  }
);

// Add index on clientid for faster lookups
HrgSchema.index({ clientid: 1 });
HrgSchema.index({ recvdate: -1 });

const HRGModel = hrgConnection.model("HRG", HrgSchema);

export default HRGModel;

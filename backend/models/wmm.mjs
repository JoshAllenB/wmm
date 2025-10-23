import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const wmmConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

const WmmSchema = new mongoose.Schema(
  {
    id: Number,
    clientid: Number,
    subsdate: String,
    enddate: String,
    renewdate: String,
    subsyear: Number,
    copies: Number,
    remarks: String,
    paymtref: String,
    paymtamt: Number,
    paymtmasses: Number,
    calendar: Boolean,
    subsclass: String,
    donorid: Number,
    donornote: String,
    adddate: String,
    adduser: String,
    editdate: Date,
    edituser: String,
  },
  {
    versionKey: false,
    collection: "wmm",
  }
);

// Add index on clientid for faster lookups
WmmSchema.index({ clientid: 1 });
WmmSchema.index({ subsdate: -1 });

const WmmModel = wmmConnection.model("wmm", WmmSchema);

export default WmmModel;

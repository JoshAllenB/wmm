import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const wmmConnection = mongoose.createConnection(process.env.MONGODB_URI_CLIENT);

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
    paymtamt: Number,
    paymtmasses: Number,
    calendar: Boolean,
    subsclass: String,
    donorid: Number,
    adddate: String,
    adduser: String,
  },
  {
    versionKey: false,
    collection: "wmm",
  },
);

const WmmModel = wmmConnection.model("wmm", WmmSchema);

export default WmmModel;

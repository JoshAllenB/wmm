import mongoose from "mongoose";

const wmmConnection = mongoose.createConnection(
  "mongodb://127.0.0.1:27017/wmm_client",
);

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

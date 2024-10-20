import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fomConnection = mongoose.createConnection(process.env.MONGODB_URI_CLIENT);

const FomSchema = new mongoose.Schema(
  {
    id: Number,
    clientid: Number,
    recvdate: String,
    remarks: String,
    paymtamt: Number,
    unsubscribe: Boolean,
    adddate: String,
    adduser: String,
  },
  {
    versionKey: false,
    collection: "fom",
  }
);

const FomModel = fomConnection.model("fom", FomSchema);

export default FomModel;

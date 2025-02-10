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
    paymtref: Number,
    paymtamt: Number,
    unsubscribe: Boolean,
    adddate: String,
    adduser: String,
  },
  {
    versionKey: false,
    collection: "hrg",
  }
);

const HRGModel = hrgConnection.model("HRG", HrgSchema);

export default HRGModel;

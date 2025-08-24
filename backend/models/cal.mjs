import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const calConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

const CalSchema = new mongoose.Schema({
  id: Number,
  clientid: Number,
  recvdate: String,
  caltype: String,
  calqty: Number,
  calunit: Number,
  calamt: Number,
  paymtref: String,
  paymtamt: Number,
  paymtform: String,
  paymtdate: String,
  remarks: String,
  adddate: String,
  adduser: String,
}, {
  versionKey: false,
  collection: "cal",
});

const CalModel = calConnection.model("cal", CalSchema);

export default CalModel;
  
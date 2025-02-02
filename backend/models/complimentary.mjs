import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const complimentaryConnection = mongoose.createConnection(
  process.env.MONGODB_URI,
  {
    dbName: process.env.DB_NAME_CLIENT,
  }
);

const ComplimentarySchema = new mongoose.Schema(
  {
    id: Number,
    clientId: Number,
    subsdate: Date,
    enddate: Date,
    subsyear: Number,
    copies: Number,
    remarks: String,
    calendar: String,
    adddate: Date,
    adduser: String,
  },
  {
    versionKey: false,
  }
);

const ComplimentaryModel = complimentaryConnection.model(
  "Complimentary",
  ComplimentarySchema,
  "complimentary"
);

export default ComplimentaryModel;
  
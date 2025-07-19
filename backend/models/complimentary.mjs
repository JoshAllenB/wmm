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
    clientid: Number, // Changed from clientId to clientid
    subsdate: String,
    enddate: String,
    subsyear: Number,
    copies: Number,
    remarks: String,
    calendar: Number,
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

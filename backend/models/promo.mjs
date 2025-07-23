import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const promoConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

const PromoSchema = new mongoose.Schema(
  {
    id: Number,
    clientid: Number, // Changed from clientId to clientid
    subsdate: String,
    enddate: String,
    subsyear: Number,
    copies: Number,
    remarks: String,
    calendar: Number,
    referralid: Number,
    adddate: String,
    adduser: String,
  },
  {
    versionKey: false,
  }
);

const PromoModel = promoConnection.model("Promo", PromoSchema, "promo");

export default PromoModel;

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const promoConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

const PromoSchema = new mongoose.Schema(
  {
    id: Number,
    clientId: Number,
    subsdate: Date,
    enddate: Date,
    subsyear: Number,
    copies: Number,
    remarks: Number,
    calendar: Number,
    referralid: Number,
    adddate: Date,
    adduser: String,
  },
  {
    versionKey: false,
  }
);

const PromoModel = promoConnection.model("Promo", PromoSchema, "promo");

export default PromoModel;

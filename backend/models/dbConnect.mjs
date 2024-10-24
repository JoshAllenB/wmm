// db.mjs
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const dbConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_USER,
});

dbConnection.once("open", () => {
  console.log("Connection to MongoDB established");
});

export default dbConnection;

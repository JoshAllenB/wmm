// db.mjs
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const dbConnection = mongoose.createConnection(process.env.MONGODB_URI_USER);

dbConnection.once("open", () => {
  console.log("Connection to MongoDB established");
});

export default dbConnection;

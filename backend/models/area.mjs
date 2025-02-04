import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const areaConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

// Define a sub-schema for locations within each acode
const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    zipcode: { type: Number, required: false }, // Some locations may not have zipcodes
    description: { type: String, required: false }, // Some may not have descriptions
  },
  { _id: false } // Prevents automatic _id creation for sub-documents
);

const AreaSchema = new mongoose.Schema(
  {
    _id: String, // This will store the `acode` (e.g., "LZN", "LZN 1")
    locations: { type: [LocationSchema], required: true }, // Array of locations under this acode
  },
  {
    versionKey: false,
    collection: "area",
  }
);

const AreaModel = areaConnection.model("area", AreaSchema);

export default AreaModel;

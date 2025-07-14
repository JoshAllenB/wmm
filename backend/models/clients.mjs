import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const clientConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
});

const ClientSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    spack: { type: Boolean, index: true },
    lname: { type: String, index: true },
    fname: { type: String, index: true },
    mname: String,
    sname: String,
    title: String,
    bdate: String,
    company: { type: String, index: true },
    address: { type: String, index: true },
    housestreet: { type: String, index: true },
    subdivision: { type: String, index: true },
    barangay: { type: String, index: true },
    zipcode: Number,
    area: String,
    acode: { type: String, index: true },
    contactnos: { type: String, index: true },
    cellno: { type: String, index: true },
    ofcno: String,
    email: { type: String, index: true },
    type: String,
    group: String,
    remarks: String,
    adddate: String,
    adduser: String,
  },
  {
    versionKey: false,
  }
);

// Create compound indexes for common search combinations
ClientSchema.index({ lname: 1, fname: 1 });
ClientSchema.index({ company: 1, address: 1 });

const ClientModel = clientConnection.model("clients", ClientSchema);

export default ClientModel;

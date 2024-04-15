// client.mjs
import mongoose from "mongoose";

// Create a new connection for the "wmm_client" database
const clientConnection = mongoose.createConnection(
  "mongodb://127.0.0.1:27017/wmm_client"
);

const ClientSchema = new mongoose.Schema(
  {
    id: Number,
    name: {
      lname: String,
      fname: String,
      mname: String,
      sname: String,
    },
    title: String,
    bdate: String,
    company: String,
    address: String,
    zipcode: Number,
    area: String,
    acode: String,
    contactnos: String,
    cellno: String,
    ofcno: String,
    email: String,
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

const ClientModel = clientConnection.model("clients", ClientSchema);

export default ClientModel;

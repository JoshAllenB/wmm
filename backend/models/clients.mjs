// client.mjs
import mongoose from "mongoose";

// Create a new connection for the "wmm_client" database
const clientConnection = mongoose.createConnection(
  "mongodb://127.0.0.1:27017/wmm_client",
);

const ClientSchema = new mongoose.Schema(
  {
    id: Number,
    lname: String,
    fname: String,
    mname: String,
    sname: String,
    title: String,
    bdate: String,
    company: String,
    address: String,
    street: String,
    city: String,
    barangay: String,
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
    subscriptionFreq: String,
    subscriptionStart: String,
    subscriptionEnd: String,
    copies: Number,
    metadata: {
      addedBy: String,
      addedAt: { type: Date, default: Date.now },
      editedBy: String,
      editedAt: { type: Date },
    },
  },
  {
    versionKey: false,
  },
);

const ClientModel = clientConnection.model("clients", ClientSchema);

export default ClientModel;

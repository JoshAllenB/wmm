// client.mjs
import mongoose from "mongoose";

// Create a new connection for the "wmm_client" database
const clientConnection = mongoose.createConnection(
  "mongodb://127.0.0.1:27017/wmm_client"
);

const ClientSchema = new mongoose.Schema(
  {
    id: Number,
    Name: {
      lname: String,
      fname: String,
      mname: String,
      sname: String,
      title: String,
    },
    bdate: String,
    company: String,
    Address: {
      address: String,
      zipcode: Number,
      area: String,
      acode: String,
    },
    ContactInfo: {
      contactnos: String,
      cellno: String,
      ofcno: String,
      email: String,
    },
    type: String,
    group: String,
    remarks: String,
    adddate: String,
    adduser: String,
    subscriptionFreq: String,
    subscriptionStart: String,
    subscriptionEnd: String,
    copies: Number,
  },
  {
    versionKey: false,
  }
);

ClientSchema.virtual("fullName").get(function () {
  return `${this.title} ${this.lname} ${this.fname} ${this.mname} ${this.sname}`;
});

ClientSchema.index({ fullName: "text" });

const ClientModel = clientConnection.model("clients", ClientSchema);

export default ClientModel;

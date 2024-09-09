import mongoose from "mongoose";

const hrgConnection = mongoose.createConnection(
  "mongodb://127.0.0.1:27017/wmm_client",
);

const HrgSchema = new mongoose.Schema(
  {
    id: Number,
    clientid: Number,
    recvdate: String,
    renewdate: String,
    paymtamt: Number,
    unsubscribe: Number,
    adddate: String,
    adduser: String,
  },
  {
    versionKey: false,
    collection: "hrg",
  },
);

const HrgModel = hrgConnection.model("hrg", HrgSchema);

export default HrgModel;

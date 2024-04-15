import  mongoose  from "mongoose";
import ClientModel from "./models/clients.mjs";

mongoose.connect("mongodb://127.0.0.1:27017/wmm_client");

async function migrateDocuments() {
  try {
    const clients = await ClientModel.find();

    for (const client of clients) {
      clients.name = {
        lname: client.lname,
        fname: client.fname,
        mname: client.mname,
        sname: client.sname,
      };

      await client.save();
    }
    console.log("Migration complete.");
  } catch (err) {
    console.error("error during migration:", err);
  } finally {
    mongoose.disconnect();
  }
}

migrateDocuments();

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();


const clientConnection = mongoose.createConnection(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME_USER,
});


const LogSchema = new mongoose.Schema({
    clientId: Number, // Reference to the client that was changed
    userId: String,   // Who made the change
    action: String,   // 'create', 'update', 'delete'
    timestamp: { type: Date, default: Date.now },
    changes: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }]
  }, {
    versionKey: false
});

const LogModel = clientConnection.model("logs", LogSchema);

export default LogModel;
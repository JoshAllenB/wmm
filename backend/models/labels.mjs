import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Create a dedicated connection with explicit options to avoid Mongoose errors
const labelConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME_CLIENT,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  bufferCommands: false, // Disable buffering for better error handling
  autoIndex: true
});

// Add connection error handling
labelConnection.on('error', (err) => {
  console.error('Label connection error:', err);
});

labelConnection.on('connected', () => {
  console.log('Label connection established successfully');
});

const LabelSchema = new mongoose.Schema(
  {
    id: String,
    description: String,
    left: Number,
    width: Number,
    height: Number,
    columns: Number,
    // Original field names are the main fields, with aliases to the new names
    init: { type: String, alias: 'initCommand' },
    format: { type: String, alias: 'formatStr' },
    reset: { type: String, alias: 'resetCommand' },
    type: String,
    printer: String,
  },
  {
    versionKey: false,
    strict: false,  // Allow flexible data for legacy import
    collection: 'labels'  // Explicitly set collection name
  }
);

// Ensure model is properly initialized
let LabelModel;
try {
  // Check if model exists already to prevent recompiling model error
  LabelModel = labelConnection.models.labels || 
               labelConnection.model("labels", LabelSchema);
  console.log("Label model initialized successfully");
} catch (err) {
  console.error("Error initializing label model:", err);
  // Fallback creation
  LabelModel = labelConnection.model("labels", LabelSchema);
}

export default LabelModel;

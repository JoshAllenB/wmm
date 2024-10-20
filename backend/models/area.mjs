import mongoose, { Mongoose } from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const areaConnection = mongoose.createConnection(
    process.env.MONGODB_URI_CLIENT,
);

const AreaSchema  = new mongoose.Schema(
    {
        id: Number,
        name: String,
        zipcode: Number,
        acode: String,
        description: String,
    },
    {
        versionKey: false,
        collection: "area",
    }
)

const AreaModel = areaConnection.model("area", AreaSchema);

export default AreaModel;
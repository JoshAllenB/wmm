import mongoose from "mongoose";
import dotenv from "dotenv";
import ClientModel from "../models/clients.mjs";
import GroupModel from "../models/groups.mjs";

dotenv.config();

async function fetchGroupsWithClients() {
  try {
    const result = await GroupModel.aggregate([
      {
        $lookup: {
          from: ClientModel.collection.name, // The name of the clients collection
          localField: "id", // The field in the groups collection
          foreignField: "group", // The field in the clients collection
          as: "clients", // The name of the array field to add to the groups
        },
      },
      {
        $project: {
          id: 1,
          name: 1,
          description: 1,
          clients: {
            id: 1,
            lname: 1,
            fname: 1,
            mname: 1,
            sname: 1,
            title: 1,
            bdate: 1,
            company: 1,
            address: 1,
            street: 1,
            city: 1,
            barangay: 1,
            zipcode: 1,
            area: 1,
            acode: 1,
            contactnos: 1,
            cellno: 1,
            ofcno: 1,
            email: 1,
            type: 1,
            group: 1,
            remarks: 1,
            adddate: 1,
            adduser: 1,
            metadata: 1,
          },
        },
      },
    ]);

    console.log("Groups with Clients:", result);
  } catch (error) {
    console.error("Error fetching groups with clients:", error);
  } finally {
    mongoose.connection.close(); // Close the connection when done
  }
}

// Connect to the database and run the function
mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME_CLIENT })
  .then(() => {
    console.log("Database connected");
    return fetchGroupsWithClients();
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });

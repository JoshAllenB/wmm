import express from "express";
import mongoose, { MongooseError, mongo } from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import cors from "cors";
import UserModel from "./models/users.mjs";
import ClientModel from "./models/clients.mjs";
import { fileURLToPath } from "url";
import path from "path";
import userAuthRouter from "./userAuth/userAuth.mjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());
app.use("/auth", userAuthRouter);

mongoose.set("debug", true);

app.get("/address/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const client = await ClientModel.findById(id);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({ address: client.address }); // Return the address
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/clients", async (req, res) => {
  try {
    const clients = await ClientModel.find()
      .select(
        "id lname fname mname sname title bdate company address zipcode area acode contactnos cellno ofcno email type group remarks adddate adduser"
      )
      .sort({ id: 1 }); // Sort by id in ascending order

    res.json(clients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/clients/recent", async (req, res) => {
  const { days } = req.query;

  try {
    const currentDate = new Date();
    const startDate = new Date(
      currentDate.getTime() - days * 24 * 60 * 60 * 1000
    );

    const recentClients = await ClientModel.find({
      adddate: { $gte: startDate },
    })
      .select(
        "id lname fname mname sname title bdate company address zipcode area acode contactnos cellno ofcno email type group remarks adddate adduser"
      )
      .sort({ adddate: -1 }); // Sort by adddate in descending order

    res.json(recentClients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/clients/add", async (req, res) => {
  try {
    // Find the highest ID in the ClientModel
    const highestIdClient = await ClientModel.findOne().sort({ id: -1 });

    // Get the highest ID or default to 0 if no clients exist
    const highestId = highestIdClient ? highestIdClient.id : 0;

    // Increment the highest ID by one to get the new ID for the client
    const newId = highestId + 1;

    // Add the new ID to the request body
    req.body.id = newId;

    // Create the new client
    const newClient = await ClientModel.create(req.body);
    res.json(newClient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedClient = req.body;

    // Find the client by ID and update
    const result = await ClientModel.findByIdAndUpdate(
      id,
      updatedClient,
      { new: true } // Return the updated document
    );

    if (!result) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Received DELETE request for client ID:", id); // Log the received request

    // Find the client by ID and remove
    const result = await ClientModel.findOneAndDelete({ _id: id });

    if (!result) {
      console.log("Client not found for ID:", id); // Log if client not found
      return res.status(404).json({ error: "Client not found" });
    }

    console.log("Client deleted successfully:", result); // Log if client deleted successfully
    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/search", async (req, res) => {
  const { query: searchQuery } = req.query;

  try {
    // Check if the search query is a valid number
    const id = parseInt(searchQuery);
    if (!isNaN(id)) {
      // If the search query is a valid number, perform a direct query by id
      const client = await ClientModel.findOne({ id });
      if (client) {
        // If a client with the provided id is found, return it
        res.json([client]); // Return as an array for consistency with text search results
      } else {
        res.json([]); // If no client is found, return an empty array
      }
    } else {
      // If the search query is not a valid number, perform a text search
      const clients = await ClientModel.find(
        { $text: { $search: searchQuery } },
        { score: { $meta: "textScore" } } // Optionally, retrieve the relevance score
      )
        .sort({ score: { $meta: "textScore" } }) // Sort by relevance score
        .limit(20); // Limit the number of results to 20

      res.json(clients);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.use(express.static(path.join(__dirname, "../client/dist")));

// Handle React routing, return all requests to React app
app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
const IP = "0.0.0.0";

app.listen(PORT, IP, () => {
  console.log(`Server is running on ${IP}:${PORT}`);
});

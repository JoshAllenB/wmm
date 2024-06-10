import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import ClientModel from "./models/clients.mjs";
import { fileURLToPath } from "url";
import path from "path";
import userAuthRouter from "./userAuth/userAuth.mjs";
import verifyToken from "./userAuth/verifyToken.mjs";
import UserModel from "./models/users.mjs";
import initWebSocket from "./websocket.mjs"; // New import for WebSocket logic

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // Allow your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/auth", userAuthRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allow your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

mongoose.set("debug", true);

initWebSocket(io);

app.get("/address/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const client = await ClientModel.findById(id);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({ address: client.address });
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/clients", async (req, res) => {
  try {
    const { page = 1, limit = 1000 } = req.query;

    const startIndex = (page - 1) * limit;

    const totalClients = await ClientModel.find().countDocuments();
    const totalPages = Math.ceil(totalClients / limit);

    const clients = await ClientModel.find()
      .select(
        "id lname fname mname sname title bdate company address steet city barangay zipcode area acode contactnos cellno ofcno email type group remarks adddate adduser subscriptionFreq subscriptionStart subscriptionEnd copies metadata"
      )
      .sort({ id: -1 })
      .limit(limit)
      .skip(startIndex);

    const clientsWithMetadata = clients.map((client) => ({
      ...client._doc,

      adduser: client.adduser,
      adddate: client.adddate,
      metadata: {
        addedBy: client.metadata.addedBy,
        addedAt: client.metadata.addedAt
          ? new Date(client.metadata.addedAt)
          : new Date(),
        editedBy: client.metadata.editedBy,
        editedAt: client.metadata.editedAt,
      },
    }));

    res.header("X-Total-Count", totalClients);
    res.header("X-Current-Page", page);
    res.header("X-Total-Pages", totalPages);
    io.emit("data-update", { type: "init", data: clients });
    res.json(clientsWithMetadata);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/clients/add", verifyToken, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId).select("username");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const highestIdClient = await ClientModel.findOne().sort({ id: -1 });
    const highestId = highestIdClient ? highestIdClient.id : 0;
    const newId = highestId + 1;

    const newClient = await ClientModel.create({
      ...req.body,
      id: newId,
      metadata: {
        addedBy: user.username,
        addedAt: new Date(),
        editedBy: null,
        editedAt: null,
      },
    });
    io.emit("data-update", { type: "add", data: newClient });
    res.json(newClient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/clients/:id", verifyToken, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId).select("username");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const { id } = req.params;
    const updatedClientData = {
      ...req.body,
      metadata: {
        ...req.body.metadata,
        editedBy: user.username,
        editedAt: new Date(),
      },
    };

    const updatedClient = await ClientModel.findOneAndUpdate(
      { id },
      updatedClientData,
      { new: true }
    );
    if (!updatedClient) {
      return res.status(404).json({ error: "Client not found" });
    }
    io.emit("data-update", { type: "update", data: updatedClient });
    res.json(updatedClient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/clients/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await ClientModel.findOneAndDelete({ id });

    if (!result) {
      return res.status(404).json({ error: "Client not found" });
    }

    io.emit("data-update", { type: "delete", data: { id } });

    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/search", async (req, res) => {
  const { query: searchQuery } = req.query;

  try {
    const id = parseInt(searchQuery);
    if (isNaN(id)) {
      const clients = await ClientModel.find(
        { $text: { $search: searchQuery } },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(20);

      res.json(clients);
    } else {
      const client = await ClientModel.findOne({ id });
      if (client) {
        res.json([client]);
      } else {
        res.json([]);
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
const IP = "0.0.0.0";

server.listen(PORT, IP, () => {
  console.log(`Server is running on http://${IP}:${PORT}`);
});

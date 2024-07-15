import express from "express";
import http from "http";
import { Server } from "socket.io";
import initWebSocket from "../../websocket.mjs";
import ClientModel from "../../models/clients.mjs";
import verifyToken from "../../userAuth/verifyToken.mjs";
import UserModel from "../../models/users.mjs";

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allow your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

const router = express.Router();
initWebSocket(io);

router.get("/", async (req, res) => {
  const io = req.io;
  try {
    const { page = 1, limit = 1000 } = req.query;

    const startIndex = (page - 1) * limit;

    const totalClients = await ClientModel.find().countDocuments();
    const totalPages = Math.ceil(totalClients / limit);

    const clients = await ClientModel.find()
      .select(
        "id lname fname mname sname title bdate company address street city barangay zipcode area acode contactnos cellno ofcno email type group remarks adddate adduser subscriptionFreq subscriptionStart subscriptionEnd copies metadata"
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

router.post("/add", verifyToken, async (req, res) => {
  const io = req.io;
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

router.put("/:id", verifyToken, async (req, res) => {
  const io = req.io;
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

router.delete("/delete/:id", verifyToken, async (req, res) => {
  const io = req.io;
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

export default router;

import express from "express";
import http from "http";
import { Server } from "socket.io";
import initWebSocket from "../../websocket.mjs";
import ClientModel from "../../models/clients.mjs";
import verifyToken from "../../userAuth/verifyToken.mjs";
import UserModel from "../../models/userControl/users.mjs";
import WmmModel from "../../models/wmm.mjs";

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
    const { page = 1, limit = 1000, pageSize = 20, filter = "" } = req.query;
    const skip = (page - 1) * pageSize;

    const numericFilter = Number(filter);
    const isNumeric = !isNaN(numericFilter);

    const filterQuery = {
      $or: [
        ...(isNumeric ? [{ id: numericFilter }] : []),
        { lname: { $regex: filter, $options: "i" } },
        { fname: { $regex: filter, $options: "i" } },
        { mname: { $regex: filter, $options: "i" } },
        { sname: { $regex: filter, $options: "i" } },
      ],
    };

    const [totalClients, clients, wmmData] = await Promise.all([
      ClientModel.countDocuments(filterQuery),
      ClientModel.find(filterQuery)
        .select(
          "id lname fname mname sname title bdate company address street city barangay zipcode area acode contactnos cellno ofcno email type group remarks adddate adduser subscriptionFreq subscriptionStart subscriptionEnd copies metadata",
        )
        .sort({ id: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      WmmModel.aggregate([
        {
          $group: {
            _id: "$clientid",
            records: {
              $push: {
                subsdate: "$subsdate",
                enddate: "$enddate",
                renewdate: "$renewdate",
                subsyear: "$subsyear",
                copies: "$copies",
                adduser: "$adduser",
                adddate: "$adddate",
                metadata: "$metadata",
              },
            },
          },
        },
      ]),
    ]);

    const totalPages = Math.ceil(totalClients / pageSize);

    const wmmDataMap = new Map(wmmData.map((item) => [item._id, item.records]));

    const combinedData = clients.map((client) => ({
      ...client,
      wmmData: (wmmDataMap.get(client.id) || []).map((record) => ({
        ...record,
        metadata: {
          addedBy:
            record.metadata?.addedBy || client.metadata?.addedBy || "Unknown", // Provide a fallback if addedBy is undefined
          addedAt: record.metadata?.addedAt
            ? new Date(record.metadata.addedAt)
            : client.metadata?.addedAt || new Date(),
          editedBy:
            record.metadata?.editedBy || client.metadata?.editedBy || "Unknown", // Fallback if editedBy is undefined
          editedAt: record.metadata?.editedAt
            ? new Date(record.metadat.editedAt)
            : client.metadata?.editedAt,
        },
      })),
    }));

    io.emit("data-update", { type: "init", data: combinedData });
    res.json({ totalPages, combinedData });
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
      { new: true },
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

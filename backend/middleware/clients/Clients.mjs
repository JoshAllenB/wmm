import express from "express";
import http from "http";
import { Server } from "socket.io";
import initWebSocket from "../../websocket.mjs";
import ClientModel from "../../models/clients.mjs";
import verifyToken from "../../userAuth/verifyToken.mjs";
import UserModel from "../../models/users.mjs";
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
    const { page = 1, pageSize = 20, filter = "" } = req.query;

    const startIndex = (page - 1) * pageSize;

    const numericFilter = Number(filter);
    const isNumeric = !isNaN(numericFilter);

    const filterQuery = {
      $or: [
        ...(isNumeric ? [{ id: numericFilter }] : []),
        { lname: { $regex: filter, $options: "i" } },
        { fname: { $regex: filter, $options: "i" } },
        { mname: { $regex: filter, $options: "i" } },
        { sname: { $regex: filter, $options: "i" } },
        { email: { $regex: filter, $options: "i" } },
      ],
    };

    const totalClients = await ClientModel.countDocuments(filterQuery);

    const totalPages = Math.ceil(totalClients / pageSize);

    const wmmData = await WmmModel.aggregate([
      {
        $project: {
          _id: 0,
          clientid: 1,
          subsdate: 1,
          enddate: 1,
          renewdate: 1,
          subsyear: 1,
          copies: 1,
        },
      },
      {
        $group: {
          _id: "$clientid",
          records: { $push: "$$ROOT" },
        },
      },
    ]);

    const clients = await ClientModel.find(filterQuery)
      .select(
        "id lname fname mname sname title bdate company address street city barangay zipcode area acode contactnos cellno ofcno email type group remarks adddate adduser subscriptionFreq subscriptionStart subscriptionEnd copies metadata",
      )
      .sort({ id: -1 })
      .limit(Number(pageSize))
      .skip(startIndex);

    const combinedData = clients.map((client) => {
      const wmmRecords = wmmData.find((item) => item._id === client.id) || {
        records: [],
      };

      const flattenedWmmData = wmmRecords.records.map((record) => ({
        subsdate: record.subsdate,
        enddate: record.enddate,
        renewdate: record.renewdate,
        subsyear: record.subsyear,
        copies: record.copies,
      }));

      return {
        ...client.toObject(),
        wmmData: flattenedWmmData.map((record) => ({
          ...record,
          adduser: record.adduser,
          adddate: record.adddate,
          metadata: {
            addedBy: record.metadata?.addedBy || client.metadata?.addedBy,
            addedAt: record.metadata?.addedAt
              ? new Date(record.metadata.addedAt)
              : client.metadata?.addedAt || new Date(),
            editedBy: record.metadata?.editedBy || client.metadata?.editedBy,
            editedAt: record.metadata?.editedAt
              ? new Date(record.metadata.editedAt)
              : client.metadata?.editedAt,
          },
        })),
      };
    });

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

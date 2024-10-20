import express from "express";
import http from "http";
import { Server } from "socket.io";
import initWebSocket from "../../websocket.mjs";
import ClientModel from "../../models/clients.mjs";
import verifyToken from "../../userAuth/verifyToken.mjs";
import UserModel from "../../models/userControl/users.mjs";
import { checkRole } from "../users/checkRole.mjs";
import fetchClientServices from "../apiLogic/fetchClientServices.mjs";
import fetchData from "../apiLogic/fetchData.mjs";
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

router.get(
  "/",
  verifyToken,
  checkRole(["Admin", "HRG", "WMM", "FOM"]),
  async (req, res) => {
    const io = req.io;
    const { page = 1, limit = 1000, pageSize = 20, filter = "" } = req.query;

    try {
      await req.user.populate({
        path: "roles.role",
        populate: { path: "defaultPermissions" },
      });
      const userRole = req.user.roles[0]?.role.name || "No Role";
      let totalPages, combinedData;

      if (userRole === "Admin") {
        const results = await Promise.all([
          fetchData("WmmModel", filter, page, limit, pageSize),
          fetchData("HrgModel", filter, page, limit, pageSize),
          fetchData("FomModel", filter, page, limit, pageSize),
          fetchData("CalModel", filter, page, limit, pageSize),
        ]);

        combinedData = results.flatMap((result) => result.combinedData);
        totalPages = Math.max(...results.map((result) => result.totalPages));
      } else if (userRole === "HRG") {
        const result = await Promise.all([
          fetchData("HrgModel", filter, page, limit, pageSize),
          fetchData("FomModel", filter, page, limit, pageSize),
          fetchData("CalModel", filter, page, limit, pageSize),
        ]);
        combinedData = result.flatMap((result) => result.combinedData);
        totalPages = Math.max(...result.map((result) => result.totalPages));
      } else {
        const modelName = `${userRole}Model`;
        ({ totalPages, combinedData } = await fetchData(
          modelName,
          filter,
          parseInt(page),
          parseInt(limit),
          parseInt(pageSize)
        ));
      }

      const clientIds = combinedData.map((client) => client.id);
      const clientServices = await fetchClientServices(clientIds);

      combinedData = combinedData.map((client) => {
        const serviceInfo = clientServices.find(
          (cs) => cs.clientId === client.id
        );
        return {
          ...client,
          services: serviceInfo ? serviceInfo.services : [],
        };
      });

      io.emit("data-update", { type: "init", data: combinedData });
      res.json({ totalPages, combinedData });
    } catch (err) {
      console.error("Error in client GET route:", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  }
);

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

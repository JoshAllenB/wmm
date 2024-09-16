import express from "express";
import http from "http";
import { Server } from "socket.io";
import HrgModel from "../../models/hrg.mjs";
import UserModel from "../../models/userControl/users.mjs";
import verifyToken from "../../userAuth/verifyToken.mjs";
import initWebSocket from "../../websocket.mjs";
import { Certificate } from "crypto";
import { clear } from "console";

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
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

    const totalClients = await HrgModel.find().countDocuments();
    const totalPages = Math.ceil(totalClients / limit);

    const hrgs = await HrgModel.find()
      .select(
        "id clientid recvdate renewdate paymtamt unsubscribe adddate adduser",
      )
      .sort({ id: -1 })
      .limit(limit)
      .skip(startIndex);

    io.emit("hrg-update", { type: "init", data: hrgs });
    res.status(200).json(hrgs);
  } catch (err) {
    console.error("Error retrieving HRGs:", err);
    res.status(500).send("Server error");
  }
});

router.post("/add", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const user = await UserModel.findById(req.userId).select("username");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const highestIdHrg = await HrgModel.findOne().sort({ id: -1 });
    const highestId = highestIdHrg ? highestIdHrg.id : 0;
    const newId = highestId + 1;

    const newHrg = await HrgModel.create({
      ...req.body,
      id: newId,
      adduser: user.username,
    });

    io.emit("hrg-update", { type: "add", data: newHrg });
    res.json(newHrg);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const user = await UserModel.findById(req.userId).select("username");

    if (!user) {
      return res.status(401).json({ error: "user not found" });
    }

    const { id } = req.params;
    const updatedHrgData = {
      ...req.body,
    };

    const updatedHrg = await HrgModel.findOneAndUpdate({ id }, updatedHrgData, {
      new: true,
    });
    if (!updatedHrg) {
      return res.status(404).json({ error: "Client not found" });
    }

    io.emit("hrg-update", { type: "update", data: updatedHrg });
    res.json(updatedHrg);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/delete/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const { id } = req.params;

    const result = await HrgModel.findOneAndDelete({ id });

    if (!result) {
      return res.status(404).json({ error: "Client not found" });
    }

    io.emit("hrg-update", { type: "delete", data: { id } });
    res.json({ message: "Client delete succesfully" });
  } catch (err) {
    console.error("Error in delete route:", err);
    res.status(500).json({ error: "Internal Server error" });
  }
});

export default router;

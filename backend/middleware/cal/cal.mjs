import express from "express";
import CalModel from "../../models/cal.mjs";
import UserModel from "../../models/userControl/users.mjs";
import { verifyToken } from "../../userAuth/verifyToken.mjs";

const router = express.Router();

// Get all CAL records
router.get("/", async (req, res) => {
  const io = req.io;
  try {
    const { page = 1, limit = 1000 } = req.query;
    const startIndex = (page - 1) * limit;

    const totalClients = await CalModel.find().countDocuments();
    const totalPages = Math.ceil(totalClients / limit);

    const cals = await CalModel.find()
      .select(
        "id clientid recvdate caltype calqty calunit calamt paymtref paymtamt paymtform paymtdate remarks adddate adduser"
      )
      .sort({ id: -1 })
      .limit(limit)
      .skip(startIndex);

    io.emit("cal-update", { type: "init", data: cals });
    res.status(200).json(cals);
  } catch (err) {
    console.error("Error retrieving CALs:", err);
    res.status(500).send("Server error");
  }
});

// Add a new CAL record
router.post("/add", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const user = await UserModel.findById(req.userId).select("username");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const highestIdCal = await CalModel.findOne().sort({ id: -1 });
    const highestId = highestIdCal ? highestIdCal.id : 0;
    const newId = highestId + 1;

    const newCal = await CalModel.create({
      ...req.body,
      id: newId,
      adduser: user.username,
    });

    io.emit("cal-update", { type: "add", data: newCal });
    res.json(newCal);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update a CAL record
router.put("/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const user = await UserModel.findById(req.userId).select("username");

    if (!user) {
      return res.status(401).json({ error: "user not found" });
    }

    const { id } = req.params;
    const updatedCalData = {
      ...req.body,
    };

    const updatedCal = await CalModel.findOneAndUpdate({ id }, updatedCalData, {
      new: true,
    });
    if (!updatedCal) {
      return res.status(404).json({ error: "Client not found" });
    }

    io.emit("cal-update", { type: "update", data: updatedCal });
    res.json(updatedCal);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a specific CAL record
router.delete("/delete/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const { id } = req.params;

    const result = await CalModel.findOneAndDelete({ id: parseInt(id) });

    if (!result) {
      return res.status(404).json({ error: "Client not found" });
    }

    io.emit("cal-update", { type: "delete", data: { id: parseInt(id) } });
    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error("Error in delete route:", err);
    res.status(500).json({ error: "Internal Server error" });
  }
});

export default router; 
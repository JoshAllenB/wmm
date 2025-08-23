import express from "express";
import FomModel from "../../models/fom.mjs";
import UserModel from "../../models/userControl/users.mjs";
import { verifyToken } from "../../userAuth/verifyToken.mjs";

const router = express.Router();

// Get all FOM records
router.get("/", async (req, res) => {
  const io = req.io;
  try {
    const { page = 1, limit = 1000 } = req.query;
    const startIndex = (page - 1) * limit;

    const totalClients = await FomModel.find().countDocuments();
    const totalPages = Math.ceil(totalClients / limit);

    const foms = await FomModel.find()
      .select(
        "id clientid recvdate paymtref paymtamt paymtform unsubscribe remarks adddate adduser"
      )
      .sort({ id: -1 })
      .limit(limit)
      .skip(startIndex);

    io.emit("fom-update", { type: "init", data: foms });
    res.status(200).json(foms);
  } catch (err) {
    console.error("Error retrieving FOMs:", err);
    res.status(500).send("Server error");
  }
});

// Add a new FOM record
router.post("/add", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const user = await UserModel.findById(req.userId).select("username");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const highestIdFom = await FomModel.findOne().sort({ id: -1 });
    const highestId = highestIdFom ? highestIdFom.id : 0;
    const newId = highestId + 1;

    const newFom = await FomModel.create({
      ...req.body,
      id: newId,
      adduser: user.username,
    });

    io.emit("fom-update", { type: "add", data: newFom });
    res.json(newFom);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update a FOM record
router.put("/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const user = await UserModel.findById(req.userId).select("username");

    if (!user) {
      return res.status(401).json({ error: "user not found" });
    }

    const { id } = req.params;
    const updatedFomData = {
      ...req.body,
    };

    const updatedFom = await FomModel.findOneAndUpdate({ id }, updatedFomData, {
      new: true,
    });
    if (!updatedFom) {
      return res.status(404).json({ error: "Client not found" });
    }

    io.emit("fom-update", { type: "update", data: updatedFom });
    res.json(updatedFom);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a specific FOM record
router.delete("/delete/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const { id } = req.params;

    const result = await FomModel.findOneAndDelete({ id: parseInt(id) });

    if (!result) {
      return res.status(404).json({ error: "Client not found" });
    }

    io.emit("fom-update", { type: "delete", data: { id: parseInt(id) } });
    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error("Error in delete route:", err);
    res.status(500).json({ error: "Internal Server error" });
  }
});

export default router; 
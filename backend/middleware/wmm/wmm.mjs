import express from "express";
import WmmModel from "../../models/wmm.mjs";
import UserModel from "../../models/userControl/users.mjs";
import { verifyToken } from "../../userAuth/verifyToken.mjs";

const router = express.Router();

router.get("/", async (req, res) => {
  const io = req.io;
  try {
    const { page = 1, limit = 1000 } = req.query;

    const startIndex = (page - 1) * limit;

    const totalSub = await WmmModel.find().countDocuments();
    const totalPages = Math.ceil(totalSub / limit);

    const wmm = await WmmModel.find()
      .select(
        "id clientid subsdate enddate renewdate subsyear copies remarks paymtamt paymtmasses calender subsclass donorid adddate adduser"
      )
      .sort({ id: -1 })
      .limit(limit)
      .skip(startIndex);

    io.emit("wmm-update", { type: "init", data: wmm });
    res.json(wmm);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add a new WMM subscription entry
router.post("/add", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    // Get the authenticated user
    const user = await UserModel.findById(req.userId).select("username");
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Generate new ID for the WMM entry
    const highestIdWmm = await WmmModel.findOne().sort({ id: -1 });
    const newWmmId = (highestIdWmm ? highestIdWmm.id : 0) + 1;
    
    // Create the new WMM entry data
    const newWmmData = {
      id: newWmmId,
      ...req.body,
      // Override or add user and date information
      adduser: user.username,
      adddate: req.body.adddate || new Date()
        .toLocaleString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
        .replace(",", ""),
    };
    
    // Ensure client ID is present
    if (!newWmmData.clientid) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "Client ID is required"
      });
    }
    
    // Create the new WMM entry
    const newWmmEntry = await WmmModel.create(newWmmData);
    
    // Emit socket event for real-time updates
    if (io) {
      io.emit("wmm-update", {
        type: "add",
        data: newWmmEntry,
      });
    }
    
    res.status(201).json(newWmmEntry);
  } catch (err) {
    console.error("Error adding WMM subscription:", err);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: err.message
    });
  }
});

export default router;

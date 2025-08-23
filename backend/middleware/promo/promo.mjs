import express from "express";
import PromoModel from "../../models/promo.mjs";
import UserModel from "../../models/userControl/users.mjs";
import { verifyToken } from "../../userAuth/verifyToken.mjs";

const router = express.Router();

// Get all Promo subscription records
router.get("/", async (req, res) => {
  const io = req.io;
  try {
    const { page = 1, limit = 1000 } = req.query;

    const startIndex = (page - 1) * limit;

    const totalSub = await PromoModel.find().countDocuments();
    const totalPages = Math.ceil(totalSub / limit);

    const promo = await PromoModel.find()
      .select(
        "id clientid subsdate enddate subsyear copies remarks calendar referralid adddate adduser"
      )
      .sort({ id: -1 })
      .limit(limit)
      .skip(startIndex);

    io.emit("promo-update", { type: "init", data: promo });
    res.json(promo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add a new Promo subscription entry
router.post("/add", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    // Get the authenticated user
    const user = await UserModel.findById(req.userId).select("username");
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Generate new ID for the Promo entry
    const highestIdPromo = await PromoModel.findOne().sort({ id: -1 });
    const newPromoId = (highestIdPromo ? highestIdPromo.id : 0) + 1;
    
    // Create the new Promo entry data
    const newPromoData = {
      id: newPromoId,
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
    if (!newPromoData.clientid) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "Client ID is required"
      });
    }
    
    // Create the new Promo entry
    const newPromoEntry = await PromoModel.create(newPromoData);
    
    // Emit socket event for real-time updates
    if (io) {
      io.emit("promo-update", {
        type: "add",
        data: newPromoEntry,
      });
    }
    
    res.status(201).json(newPromoEntry);
  } catch (err) {
    console.error("Error adding Promo subscription:", err);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: err.message
    });
  }
});

// Delete a specific Promo subscription record
router.delete("/delete/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const { id } = req.params;

    // Find the record before deletion for logging
    const recordToDelete = await PromoModel.findOne({ id: parseInt(id) });
    
    if (!recordToDelete) {
      return res.status(404).json({ 
        error: "Record not found",
        message: `No Promo subscription record found with ID ${id}`
      });
    }

    // Delete the record
    const deletedRecord = await PromoModel.findOneAndDelete({ id: parseInt(id) });

    // Emit socket event for real-time updates
    if (io) {
      io.emit("promo-update", {
        type: "delete",
        data: { 
          id: deletedRecord.id,
          clientid: deletedRecord.clientid 
        },
      });
    }

    res.json({ 
      success: true,
      message: "Promo subscription record deleted successfully",
      deletedRecord: {
        id: deletedRecord.id,
        clientid: deletedRecord.clientid,
        subsdate: deletedRecord.subsdate,
        enddate: deletedRecord.enddate
      }
    });
  } catch (err) {
    console.error("Error deleting Promo subscription record:", err);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: err.message
    });
  }
});

export default router; 
import express from "express";
import ComplimentaryModel from "../../models/complimentary.mjs";
import UserModel from "../../models/userControl/users.mjs";
import { verifyToken } from "../../userAuth/verifyToken.mjs";

const router = express.Router();

// Get all Complimentary subscription records
router.get("/", async (req, res) => {
  const io = req.io;
  try {
    const { page = 1, limit = 1000 } = req.query;

    const startIndex = (page - 1) * limit;

    const totalSub = await ComplimentaryModel.find().countDocuments();
    const totalPages = Math.ceil(totalSub / limit);

    const complimentary = await ComplimentaryModel.find()
      .select(
        "id clientid subsdate enddate subsyear copies remarks calendar adddate adduser"
      )
      .sort({ id: -1 })
      .limit(limit)
      .skip(startIndex);

    io.emit("complimentary-update", { type: "init", data: complimentary });
    res.json(complimentary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add a new Complimentary subscription entry
router.post("/add", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    // Get the authenticated user
    const user = await UserModel.findById(req.userId).select("username");
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Generate new ID for the Complimentary entry
    const highestIdComplimentary = await ComplimentaryModel.findOne().sort({ id: -1 });
    const newComplimentaryId = (highestIdComplimentary ? highestIdComplimentary.id : 0) + 1;
    
    // Create the new Complimentary entry data
    const newComplimentaryData = {
      id: newComplimentaryId,
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
    if (!newComplimentaryData.clientid) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "Client ID is required"
      });
    }
    
    // Create the new Complimentary entry
    const newComplimentaryEntry = await ComplimentaryModel.create(newComplimentaryData);
    
    // Emit socket event for real-time updates
    if (io) {
      io.emit("complimentary-update", {
        type: "add",
        data: newComplimentaryEntry,
      });
    }
    
    res.status(201).json(newComplimentaryEntry);
  } catch (err) {
    console.error("Error adding Complimentary subscription:", err);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: err.message
    });
  }
});

// Delete a specific Complimentary subscription record
router.delete("/delete/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const { id } = req.params;

    // Find the record before deletion for logging
    const recordToDelete = await ComplimentaryModel.findOne({ id: parseInt(id) });
    
    if (!recordToDelete) {
      return res.status(404).json({ 
        error: "Record not found",
        message: `No Complimentary subscription record found with ID ${id}`
      });
    }

    // Delete the record
    const deletedRecord = await ComplimentaryModel.findOneAndDelete({ id: parseInt(id) });

    // Emit socket event for real-time updates
    if (io) {
      io.emit("complimentary-update", {
        type: "delete",
        data: { 
          id: deletedRecord.id,
          clientid: deletedRecord.clientid 
        },
      });
    }

    res.json({ 
      success: true,
      message: "Complimentary subscription record deleted successfully",
      deletedRecord: {
        id: deletedRecord.id,
        clientid: deletedRecord.clientid,
        subsdate: deletedRecord.subsdate,
        enddate: deletedRecord.enddate
      }
    });
  } catch (err) {
    console.error("Error deleting Complimentary subscription record:", err);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: err.message
    });
  }
});

export default router; 
import express from "express";
import dotenv from "dotenv";
import { getDonorRecipientData } from "./logic.mjs";

dotenv.config();

const router = express.Router();

router.get("/recipient-data", async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      searchTerm,
      sortField,
      sortOrder,
    } = req.query;
    const data = await getDonorRecipientData({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      searchTerm,
      sortField,
      sortOrder,
    });
    res.json(data);
  } catch (error) {
    console.error("Error in /donor-recipient-data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import express from "express";
import dotenv from "dotenv";
import {
  getDonorRecipientData,
  getAllDonors,
  getDonorStatistics,
  searchNonDonorClients,
  convertClientToDonor,
  getDonorById,
} from "./logic.mjs";

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

router.get("/donors", async (req, res) => {
  try {
    const donors = await getAllDonors();
    res.json(donors);
  } catch (error) {
    console.error("Error in /donors:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/donors/:id", async (req, res) => {
  try {
    const donorId = parseInt(req.params.id);
    const donor = await getDonorById(donorId);

    if (!donor) {
      return res.status(404).json({ error: "Donor not found" });
    }
    res.json(donor);
  } catch (error) {
    console.error("Error in /donors/:id:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// This route is deprecated in favor of /donors/:id
router.get("/donor/:id", async (req, res) => {
  res.redirect(`/donors/${req.params.id}`);
});

router.get("/statistics", async (req, res) => {
  try {
    const statistics = await getDonorStatistics();
    res.json(statistics);
  } catch (error) {
    console.error("Error in /donor-statistics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/search-non-donors", async (req, res) => {
  try {
    const { searchTerm } = req.query;
    const clients = await searchNonDonorClients(searchTerm);
    res.json(clients);
  } catch (error) {
    console.error("Error searching non-donor clients:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/convert-to-donor", async (req, res) => {
  try {
    const { clientId } = req.body;
    const result = await convertClientToDonor(clientId);
    res.json(result);
  } catch (error) {
    console.error("Error converting client to donor:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export default router;

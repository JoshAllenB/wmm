import express, { Router } from "express";
import AreaModel from "../models/area.mjs";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const areas = await AreaModel.find()
            .select("id name zipcode acode")
            .lean();

            console.log("Area", areas)
        res.json(areas);
    } catch (err) {
        console.error("Error fetching area list:", err);
        res.status(500).json({ error: "Failed to fetch areas" });
    }
});

export default router;
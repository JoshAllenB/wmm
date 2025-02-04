import express from "express";
import verifyToken from "../userAuth/verifyToken.mjs";
import dotenv from "dotenv";

import GroupModel from "../models/groups.mjs";
import SubClassModel from "../models/subsclass.mjs";
import AreaModel from "../models/area.mjs";
import TypesModel from "../models/types.mjs";

dotenv.config();

const router = express.Router();

router.get("/groups", verifyToken, async (req, res) => {
  try {
    const groups = await GroupModel.find().select("id name").sort({ id: 1 });
    res.json(groups);
  } catch (err) {
    console.error("Error fetching groups:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/areas", async (req, res) => {
  try {
    const areas = await AreaModel.find()
      .select("id name zipcode acode")
      .sort({ _id: 1 });
    res.json(areas);
  } catch (err) {
    console.error("Error fetching area list:", err);
    res.status(500).json({ error: "Failed to fetch areas" });
  }
});

router.get("/types", verifyToken, async (req, res) => {
  try {
    const types = await TypesModel.find().select("id name").sort({ id: 1 });
    res.json(types);
  } catch (err) {
    console.error("Error fetching types:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/subclass", verifyToken, async (req, res) => {
  try {
    const subclass = await SubClassModel.find();
    res.json(subclass);
  } catch (err) {
    console.error("Error fetching subclasses:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/subclass-add", verifyToken, async (req, res) => {
  try {
    const { id, name, description } = req.body;

    const existingSubclass = await SubClassModel.findOne({ id });
    if (existingSubclass) {
      return res.status(400).json({ error: "Subclass ID already exists" });
    }

    const newSubClass = new SubClassModel({
      id,
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newSubClass.save();
    res.status(201).json(newSubClass);
  } catch (err) {
    console.error("Error creating subclass:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update subclass
router.put("/subclass-edit/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, newId } = req.body;

    const updatedSubClass = await SubClassModel.findOneAndUpdate(
      { id },
      { id: newId, name, description, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedSubClass) {
      return res.status(404).json({ error: "Subclass not found" });
    }

    res.json({ success: true, data: updatedSubClass });
  } catch (err) {
    console.error("Error updating subclass:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete subclass
router.delete("/subclass-delete/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSubClass = await SubClassModel.findOneAndDelete({ id });

    if (!deletedSubClass) {
      return res.status(404).json({ error: "Subclass not found" });
    }

    res.status(200).json({ message: "Subclass deleted successfully" });
  } catch (err) {
    console.error("Error deleting subclass:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

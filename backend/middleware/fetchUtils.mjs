import express from "express";
import { verifyToken } from "../userAuth/verifyToken.mjs";
import dotenv from "dotenv";

import GroupModel from "../models/groups.mjs";
import SubClassModel from "../models/subsclass.mjs";
import AreaModel from "../models/area.mjs";
import TypesModel from "../models/types.mjs";
import PrintLabelModel from "../models/print.mjs";
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

// Create group
router.post("/groups-add", verifyToken, async (req, res) => {
  try {
    const { id, name, description } = req.body;

    const existingGroup = await GroupModel.findOne({ id });
    if (existingGroup) {
      return res.status(400).json({ error: "Group ID already exists" });
    }

    const newGroup = new GroupModel({
      id,
      name,
      description,
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update group
router.put("/groups-edit/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, newId } = req.body;

    const updatedGroup = await GroupModel.findOneAndUpdate(
      { id },
      { id: newId || id, name, description },
      { new: true }
    );

    if (!updatedGroup) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.json({ success: true, data: updatedGroup });
  } catch (err) {
    console.error("Error updating group:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete group
router.delete("/groups-delete/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedGroup = await GroupModel.findOneAndDelete({ id });

    if (!deletedGroup) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (err) {
    console.error("Error deleting group:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/areas", async (req, res) => {
  try {
    const areas = await AreaModel.aggregate([
      {
        $project: {
          _id: 1,
          locations: {
            $map: {
              input: {
                $sortArray: { input: "$locations", sortBy: { name: 1 } },
              },
              as: "location",
              in: "$$location",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);
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

// Create area
router.post("/areas-add", verifyToken, async (req, res) => {
  try {
    const { _id, locations } = req.body;

    // Validate _id
    if (!_id || !_id.trim()) {
      return res.status(400).json({ error: "Area Code (_id) is required" });
    }

    // Validate that each location has a name
    if (!locations.every((location) => location.name)) {
      return res.status(400).json({ error: "Each location must have a name" });
    }

    // Ensure _id is set when creating the document
    const newArea = new AreaModel({ _id, locations });
    await newArea.save();

    res.status(201).json(newArea);
  } catch (err) {
    console.error("Error creating area:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update area
router.put("/areas/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { locations } = req.body;

    // Validate that each location has a name
    if (!locations.every((location) => location.name)) {
      return res.status(400).json({ error: "Each location must have a name" });
    }

    const updatedArea = await AreaModel.findOneAndUpdate(
      { _id: id },
      { locations, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedArea) {
      return res.status(404).json({ error: "Area not found" });
    }

    res.json({ success: true, data: updatedArea });
  } catch (err) {
    console.error("Error updating area:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete area
router.delete("/areas/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedArea = await AreaModel.findOneAndDelete({ _id: id });

    if (!deletedArea) {
      return res.status(404).json({ error: "Area not found" });
    }

    res.status(200).json({ message: "Area deleted successfully" });
  } catch (err) {
    console.error("Error deleting area:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/templates", verifyToken, async (req, res) => {
  try {
    const templates = await PrintLabelModel.find();
    res.json(templates);
  } catch (err) {
    console.error("Error fetching templates:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/templates-add", verifyToken, async (req, res) => {
  try {
    const { name, layout, selectedFields, previewType } = req.body;

    const newTemplate = new PrintLabelModel({
      name,
      layout,
      selectedFields,
      previewType,
    });

    await newTemplate.save();
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error saving template:", error);
    res.status(500).json({ error: "Failed to save template." });
  }
});

// Migrate existing templates to include previewType and renewal settings
router.get("/migrate-templates", verifyToken, async (req, res) => {
  try {
    // Find all templates that need migration (don't have the new fields)
    const templates = await PrintLabelModel.find({
      "layout.dataVerticalSpacing": { $exists: false }
    });

    // Default data spacing settings
    const defaultDataSpacingSettings = {
      dataVerticalSpacing: 4,
      dataHorizontalSpacing: 0,
      contentLeftMargin: 4,
      contentRightMargin: 4,
      contentTopMargin: 4,
    };

    // Default advanced label controls
    const defaultAdvancedLabelSettings = {
      labelsToSkip: 0,
      labelsPerPage: 16,
      verticalGap: 0,
    };

    // Default physical label size settings
    const defaultPhysicalLabelSettings = {
      fixedLabelWidth: 192,
      fixedLabelHeight: 96,
      showFixedLabels: true,
    };

    // Default renewal settings
    const defaultRenewalSettings = {
      renewalFontSize: 14,
      renewalLeftMargin: 40,
      renewalTopMargin: 40,
      renewalRightColumnPosition: 400,
      leftColumnLineSpacing: 8,
      rightColumnLineSpacing: 12,
      nameAddressSpacing: 24,
      addressContactSpacing: 30,
      rightColumnItemSpacing: 16,
      lineSpacing: 8,
    };

    // Default thank you letter settings
    const defaultThankYouSettings = {
      thankYouFontSize: 14,
      thankYouTopMargin: 60,
      thankYouLeftMargin: 60,
      thankYouLineSpacing: 16,
      thankYouWidth: 400,
      thankYouDateSpacing: 40,
      thankYouGreetingSpacing: 30,
      thankYouContentSpacing: 20,
    };

    // Default standard settings
    const defaultStandardSettings = {
      labelHeight: 100,
      horizontalSpacing: 20,
    };

    // Update each template
    let updatedCount = 0;
    for (const template of templates) {
      // Combine layout with default settings
      const updatedLayout = {
        ...template.layout.toObject(),
        ...defaultStandardSettings,
        ...defaultDataSpacingSettings,
        ...defaultAdvancedLabelSettings,
        ...defaultPhysicalLabelSettings,
        ...defaultRenewalSettings,
        ...defaultThankYouSettings,
      };

      // Set previewType if not already set
      const previewType = template.previewType || "standard";

      // Update the template with new fields
      await PrintLabelModel.updateOne(
        { _id: template._id },
        {
          $set: {
            previewType: previewType,
            layout: updatedLayout,
          },
        }
      );

      updatedCount++;
    }

    res.json({
      message: `Successfully migrated ${updatedCount} templates`,
      migratedCount: updatedCount,
    });
  } catch (err) {
    console.error("Error migrating templates:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add template migration endpoint for new fields
router.get("/migrate-templates-v2", verifyToken, async (req, res) => {
  try {
    // Find all templates that need migration (don't have the new fields)
    const templates = await PrintLabelModel.find();

    // Default data spacing settings
    const defaultDataSpacingSettings = {
      dataVerticalSpacing: 4,
      dataHorizontalSpacing: 0,
      contentLeftMargin: 4,
      contentRightMargin: 4,
      contentTopMargin: 4,
    };

    // Default advanced label controls
    const defaultAdvancedLabelSettings = {
      labelsToSkip: 0,
      labelsPerPage: 16,
      verticalGap: 0,
    };

    // Default physical label size settings
    const defaultPhysicalLabelSettings = {
      fixedLabelWidth: 192,
      fixedLabelHeight: 96,
      showFixedLabels: true,
    };

    // Update each template
    let updatedCount = 0;
    for (const template of templates) {
      // Create updates object with only missing fields
      const updates = {};
      
      // Check data spacing settings
      for (const [key, value] of Object.entries(defaultDataSpacingSettings)) {
        if (template.layout[key] === undefined) {
          updates[`layout.${key}`] = value;
        }
      }
      
      // Check advanced label controls
      for (const [key, value] of Object.entries(defaultAdvancedLabelSettings)) {
        if (template.layout[key] === undefined) {
          updates[`layout.${key}`] = value;
        }
      }
      
      // Check physical label size settings
      for (const [key, value] of Object.entries(defaultPhysicalLabelSettings)) {
        if (template.layout[key] === undefined) {
          updates[`layout.${key}`] = value;
        }
      }
      
      // Only update if there are missing fields
      if (Object.keys(updates).length > 0) {
        await PrintLabelModel.updateOne(
          { _id: template._id },
          { $set: updates }
        );
        updatedCount++;
      }
    }

    res.json({
      message: `Successfully updated ${updatedCount} templates with new fields`,
      migratedCount: updatedCount,
    });
  } catch (err) {
    console.error("Error updating templates with new fields:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

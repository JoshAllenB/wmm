import express from "express";
import { verifyToken } from "../userAuth/verifyToken.mjs";
import dotenv from "dotenv";
import { exec } from "child_process";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";

import GroupModel from "../models/groups.mjs";
import SubClassModel from "../models/subsclass.mjs";
import AreaModel from "../models/area.mjs";
import TypesModel from "../models/types.mjs";
import PrintLabelModel from "../models/print.mjs";
import LabelModel from "../models/labels.mjs";
// Import escpos modules for dot matrix printing
import escpos from "escpos";
// Import printer discovery functions
import { discoverAllPrinters } from "../utils/printer-discovery.mjs";
// We'll use dynamic imports for specific adapters when needed

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
    const { _id: newAreaCode, locations } = req.body;

    // Validate that each location has a name
    if (!locations.every((location) => location.name)) {
      return res.status(400).json({ error: "Each location must have a name" });
    }

    // Check if area code is being changed
    if (newAreaCode && newAreaCode !== id) {
      // Check if the new area code already exists
      const existingArea = await AreaModel.findOne({ _id: newAreaCode });
      if (existingArea) {
        return res.status(400).json({ error: "Area code already exists" });
      }

      // Update the area with new code and locations
      const updatedArea = await AreaModel.findOneAndUpdate(
        { _id: id },
        { _id: newAreaCode, locations, updatedAt: new Date() },
        { new: true }
      );

      if (!updatedArea) {
        return res.status(404).json({ error: "Area not found" });
      }

      res.json({
        success: true,
        data: updatedArea,
        message: "Area code and locations updated successfully",
      });
    } else {
      // Just update locations if area code didn't change
      const updatedArea = await AreaModel.findOneAndUpdate(
        { _id: id },
        { locations, updatedAt: new Date() },
        { new: true }
      );

      if (!updatedArea) {
        return res.status(404).json({ error: "Area not found" });
      }

      res.json({
        success: true,
        data: updatedArea,
        message: "Locations updated successfully",
      });
    }
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
    const { department } = req.query;

    // If department is specified, filter by it
    const query = department ? { department } : {};
    const templates = await PrintLabelModel.find(query).sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    console.error("Error fetching templates:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/templates-add", verifyToken, async (req, res) => {
  try {
    const {
      name,
      description,
      department,
      layout,
      selectedFields,
      previewType,
      selectedPrinter,
    } = req.body;

    // Validate required fields (department optional)
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Sanitize layout based on previewType to avoid unrelated defaults being stored
    function sanitizeLayoutByPreviewType(inputLayout, type) {
      const safe = inputLayout || {};
      const pick = (obj, keys) =>
        keys.reduce((acc, k) => {
          if (obj[k] !== undefined) acc[k] = obj[k];
          return acc;
        }, {});

      switch ((type || "standard").toLowerCase()) {
        case "renewal":
          // Only accept positions object for renewal letters
          return typeof safe.positions === "object"
            ? { positions: safe.positions }
            : { positions: {} };
        case "thankyou":
          // Only accept positions object for thank you letters
          return typeof safe.positions === "object"
            ? { positions: safe.positions }
            : { positions: {} };
        case "standard":
        default:
          // Only accept mailing label specific settings
          return pick(safe, [
            "fontSize",
            "leftPosition",
            "topPosition",
            "columnWidth",
            "labelHeight",
            "horizontalSpacing",
            "rowSpacing",
            "paperWidth",
            "paperHeight",
            "rowsPerPage",
            "columnsPerPage",
            // Raw printer specific adjustments
            "labelWidthIn",
            "topMargin",
            "rowSpacingLines",
            "col2X",
          ]);
      }
    }

    const sanitizedLayout = sanitizeLayoutByPreviewType(layout, previewType);
    const normalizedDept = (department || "").trim();

    // Overwrite existing template with same name+department or create new (upsert)
    const upsertedTemplate = await PrintLabelModel.findOneAndUpdate(
      { name, department: normalizedDept },
      {
        $set: {
          name,
          description: description || "",
          department: normalizedDept,
          layout: sanitizedLayout,
          selectedFields,
          previewType: previewType || "standard",
          selectedPrinter: selectedPrinter || "",
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { new: true, upsert: true }
    );

    res.status(200).json(upsertedTemplate);
  } catch (error) {
    console.error("Error saving template:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        error: "A template with this name already exists in this department",
      });
    }

    res.status(500).json({ error: "Failed to save template." });
  }
});

router.put("/templates/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      department,
      layout,
      selectedFields,
      previewType,
      selectedPrinter,
    } = req.body;

    function sanitizeLayoutByPreviewType(inputLayout, type) {
      const safe = inputLayout || {};
      const pick = (obj, keys) =>
        keys.reduce((acc, k) => {
          if (obj[k] !== undefined) acc[k] = obj[k];
          return acc;
        }, {});

      switch ((type || "standard").toLowerCase()) {
        case "renewal":
          return typeof safe.positions === "object"
            ? { positions: safe.positions }
            : { positions: {} };
        case "thankyou":
          return typeof safe.positions === "object"
            ? { positions: safe.positions }
            : { positions: {} };
        case "standard":
        default:
          return pick(safe, [
            "fontSize",
            "leftPosition",
            "topPosition",
            "columnWidth",
            "labelHeight",
            "horizontalSpacing",
            "rowSpacing",
            "paperWidth",
            "paperHeight",
            "rowsPerPage",
            "columnsPerPage",
            // Raw printer specific adjustments
            "labelWidthIn",
            "topMargin",
            "rowSpacingLines",
            "col2X",
          ]);
      }
    }

    const sanitizedLayout = sanitizeLayoutByPreviewType(layout, previewType);

    const normalizedDept = (department || "").trim();

    const updatedTemplate = await PrintLabelModel.findByIdAndUpdate(
      id,
      {
        name,
        description: description || "",
        department: normalizedDept,
        layout: sanitizedLayout,
        selectedFields,
        previewType: previewType || "standard",
        selectedPrinter: selectedPrinter || "",
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating template:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        error: "A template with this name already exists in this department",
      });
    }

    res.status(500).json({ error: "Failed to update template." });
  }
});

router.delete("/templates/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTemplate = await PrintLabelModel.findByIdAndDelete(id);

    if (!deletedTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ error: "Failed to delete template." });
  }
});

// Migrate existing templates to include previewType and renewal settings
router.get("/migrate-templates", verifyToken, async (req, res) => {
  try {
    // Find all templates that need migration (don't have the new fields)
    const templates = await PrintLabelModel.find({
      "layout.dataVerticalSpacing": { $exists: false },
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

// Label routes
router.get("/labels", verifyToken, async (req, res) => {
  try {
    // Try/catch specifically for the find operation
    let labels = [];
    try {
      labels = await LabelModel.find().lean().exec();
    } catch (dbErr) {
      console.error("Database error when fetching labels:", dbErr);
      // Return empty array rather than crashing
      labels = [];
    }

    res.json(labels);
  } catch (err) {
    console.error("Error fetching labels:", err);
    // Still return instead of crashing, send an empty array
    res.status(200).json([]);
  }
});

router.post("/labels-add", verifyToken, async (req, res) => {
  try {
    const {
      id,
      description,
      left,
      width,
      height,
      columns,
      init,
      format,
      reset,
      type,
      printer,
    } = req.body;

    // Check if the label already exists
    let existingLabel = null;
    try {
      existingLabel = await LabelModel.findOne({ id }).lean().exec();
    } catch (findErr) {
      console.error("Error checking for existing label:", findErr);
    }

    if (existingLabel) {
      return res.status(400).json({ error: "Label ID already exists" });
    }

    // Create a new label using raw object first
    const labelData = {
      id,
      description,
      left,
      width,
      height,
      columns,
      init,
      format,
      reset,
      type,
      printer,
    };

    try {
      // Save with better error handling
      const newLabel = new LabelModel(labelData);
      await newLabel.save();
      res.status(201).json(newLabel);
    } catch (saveErr) {
      console.error("Error saving new label to database:", saveErr);
      res.status(500).json({
        error: "Internal Server Error",
        details: saveErr.message,
        note: "Database save operation failed, but client-side templates should still work",
      });
    }
  } catch (err) {
    console.error("Error creating label:", err);
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message,
      note: "Exception in label creation process, but client-side templates should still work",
    });
  }
});

router.put("/labels-edit/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      description,
      left,
      width,
      height,
      columns,
      init,
      format,
      reset,
      type,
      printer,
      newId,
    } = req.body;

    const updatedLabel = await LabelModel.findOneAndUpdate(
      { id },
      {
        id: newId || id,
        description,
        left,
        width,
        height,
        columns,
        // Use original field names
        init,
        format,
        reset,
        type,
        printer,
      },
      { new: true }
    );

    if (!updatedLabel) {
      return res.status(404).json({ error: "Label not found" });
    }

    res.json({ success: true, data: updatedLabel });
  } catch (err) {
    console.error("Error updating label:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/labels-delete/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedLabel = await LabelModel.findOneAndDelete({ id });

    if (!deletedLabel) {
      return res.status(404).json({ error: "Label not found" });
    }

    res.status(200).json({ message: "Label deleted successfully" });
  } catch (err) {
    console.error("Error deleting label:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add new endpoint for direct dot matrix printing
router.post("/print-dot-matrix", verifyToken, async (req, res) => {
  try {
    const { labelId, data, printerConfig } = req.body;

    // Validate required fields
    if (!labelId) {
      return res.status(400).json({ error: "Label template ID is required" });
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ error: "Data array is required for printing" });
    }

    // Default printer config
    const defaultPrinterConfig = {
      type: "network", // 'network', 'usb', 'serial'
      address: "192.168.1.100", // IP address for network printer
      port: 9100, // Port for network printer
      // For USB, would need vendorId and productId
    };

    // Merge default config with provided config
    const finalPrinterConfig = { ...defaultPrinterConfig, ...printerConfig };

    // Find the label template
    const labelTemplate = await LabelModel.findOne({ id: labelId }).lean();
    if (!labelTemplate) {
      return res.status(404).json({ error: "Label template not found" });
    }

    // Try direct printer connection first
    try {
      // Initialize printer using configured adapter
      let device;
      let printer;

      if (finalPrinterConfig.type === "network") {
        // Use dynamic import for network adapter
        const networkModule = await import("escpos-network");
        escpos.Network = networkModule.default;

        device = new escpos.Network(
          finalPrinterConfig.address,
          finalPrinterConfig.port
        );
      } else if (finalPrinterConfig.type === "usb") {
        // Use dynamic import for USB adapter
        try {
          const usbModule = await import("escpos-usb");
          escpos.USB = usbModule.default;

          device = new escpos.USB(
            parseInt(finalPrinterConfig.vendorId, 16),
            parseInt(finalPrinterConfig.productId, 16)
          );
        } catch (usbError) {
          console.error("Failed to load USB adapter:", usbError);
          return res.status(400).json({
            error: "USB printer adapter could not be loaded",
            details: usbError.message,
          });
        }
      } else {
        return res.status(400).json({
          error: "Unsupported printer connection type",
          details: `Type '${finalPrinterConfig.type}' is not supported`,
        });
      }

      // Create printer instance
      printer = new escpos.Printer(device);

      // Connect to the printer
      console.log("Connecting to printer...");
      await new Promise((resolve, reject) => {
        device.open((err) => {
          if (err) {
            console.error("Failed to connect to printer:", err);
            reject(err);
          } else {
            console.log("Connected to printer successfully");
            resolve();
          }
        });
      });

      // Get the initialization and reset commands from the template
      const initCommand = labelTemplate.init || "";
      const resetCommand = labelTemplate.reset || "";
      const formatCommand = labelTemplate.format || "";

      // Initialize the printer with the template's init command
      if (initCommand) {
        // Convert ESC/POS initialization command to buffer
        const initBuffer = Buffer.from(
          initCommand.replace(/\\(\d+)/g, (match, code) =>
            String.fromCharCode(parseInt(code, 8))
          ),
          "binary"
        );

        printer.buffer(initBuffer);
      }

      // Process each row of data
      for (const row of data) {
        try {
          // Process the template format with the row data
          const processedContent = processTemplateFormat(formatCommand, row);

          // Convert to buffer and send to printer
          const contentBuffer = Buffer.from(
            processedContent.replace(/\\(\d+)/g, (match, code) =>
              String.fromCharCode(parseInt(code, 8))
            ),
            "binary"
          );

          printer.buffer(contentBuffer);
        } catch (rowError) {
          console.error(
            `Error processing row: ${JSON.stringify(row)}`,
            rowError
          );
          // Continue with next row instead of failing the entire batch
        }
      }

      // Add the reset command at the end if provided
      if (resetCommand) {
        const resetBuffer = Buffer.from(
          resetCommand.replace(/\\(\d+)/g, (match, code) =>
            String.fromCharCode(parseInt(code, 8))
          ),
          "binary"
        );

        printer.buffer(resetBuffer);
      }

      // Cut the paper and finish printing
      console.log("Finishing print job...");

      // Flush data and cut
      await new Promise((resolve) => {
        printer.cut().close(() => {
          console.log("Print job completed and connection closed");
          resolve();
        });
      });

      return res.status(200).json({
        success: true,
        message: `Successfully printed ${data.length} labels using template ${labelTemplate.id}`,
      });
    } catch (printerError) {
      console.error("Direct printer connection failed:", printerError);
      console.log("Attempting fallback printing via CUPS/lpr command...");

      // Try fallback to CUPS/lpr command-line printing
      try {
        // Generate raw printer data
        const rawData = generateRawPrinterData(labelTemplate, data);

        // Create a temporary file with the raw printer data
        const tempFilePath = path.join(
          os.tmpdir(),
          `dotmatrix-print-${Date.now()}.prn`
        );
        await writeFile(tempFilePath, rawData);
        console.log(`Raw printer data saved to ${tempFilePath}`);

        // Create the lpr print command
        let printCommand;
        if (finalPrinterConfig.type === "network") {
          // Print to network printer
          printCommand = `lpr -H ${finalPrinterConfig.address} -P raw ${tempFilePath}`;
        } else if (
          finalPrinterConfig.type === "usb" &&
          finalPrinterConfig.queueName
        ) {
          // Print to USB printer with queue name
          printCommand = `lpr -P ${finalPrinterConfig.queueName} ${tempFilePath}`;
        } else {
          // Default to raw output to default printer
          printCommand = `lpr ${tempFilePath}`;
        }

        console.log(`Executing print command: ${printCommand}`);

        // Execute the print command
        const { stdout, stderr } = await execPromise(printCommand);
        console.log("CUPS/lpr stdout:", stdout);

        if (stderr && stderr.trim() !== "") {
          console.error("CUPS/lpr stderr:", stderr);
          throw new Error(`CUPS/lpr command error: ${stderr}`);
        }

        return res.status(200).json({
          success: true,
          message: `Successfully printed ${data.length} labels using CUPS/lpr command`,
          method: "cups",
        });
      } catch (cupsError) {
        console.error("CUPS/lpr printing failed:", cupsError);
        throw new Error(
          `Both direct printing and CUPS/lpr fallback failed: ${printerError.message}, ${cupsError.message}`
        );
      }
    }
  } catch (err) {
    console.error("Error in dot matrix printing:", err);
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message,
    });
  }
});

/**
 * Promise wrapper for exec function
 * @param {string} command - Command to execute
 * @returns {Promise<{stdout: string, stderr: string}>} Promise with stdout and stderr
 */
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

/**
 * Generate raw printer data from template and data
 * @param {Object} template - The label template
 * @param {Array} data - Array of data objects
 * @returns {Buffer} Raw printer data
 */
function generateRawPrinterData(template, data) {
  const { init, format, reset } = template;
  let rawData = "";

  // Add initialization command
  if (init) {
    rawData += init.replace(/\\(\d+)/g, (match, code) =>
      String.fromCharCode(parseInt(code, 8))
    );
  }

  // Process each row
  for (const row of data) {
    try {
      // Process the format with the current row data
      const processedContent = processTemplateFormat(format, row);

      // Add to raw data
      rawData += processedContent.replace(/\\(\d+)/g, (match, code) =>
        String.fromCharCode(parseInt(code, 8))
      );
    } catch (error) {
      console.error("Error processing row for raw data:", error);
    }
  }

  // Add reset command
  if (reset) {
    rawData += reset.replace(/\\(\d+)/g, (match, code) =>
      String.fromCharCode(parseInt(code, 8))
    );
  }

  return Buffer.from(rawData, "binary");
}

/**
 * Process a template format string with data for dot matrix printing
 * Handles special functions like TRANSFORM, SYS_CDate, STR_Check, STR_Name, etc.
 *
 * @param {string} formatStr - The template format string with placeholders
 * @param {object} data - The data object to use for replacements
 * @returns {string} The processed string ready for printing
 */
function processTemplateFormat(formatStr, data) {
  if (!formatStr) return "";

  let result = formatStr;

  // First, handle basic replacements with the <<field>> format
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`<<${key}>>`, "g");
    result = result.replace(placeholder, value || "");
  }

  // Handle the TRANSFORM function - format data according to a mask
  // Example: <<TRANSFORM(id,"@L 999999")>> -> left-aligned, padded ID
  result = result.replace(
    /<<TRANSFORM\(([^,]+),\s*"([^"]+)"\)>>/g,
    (match, field, format) => {
      const value = data[field] || "";

      // Basic implementation of TRANSFORM
      if (format.includes("@L")) {
        // Left aligned with padding
        const numericPart = format.match(/(\d+)/);
        const width = numericPart ? parseInt(numericPart[0], 10) : value.length;
        return value.padEnd(width, " ");
      } else if (format.includes("@R")) {
        // Right aligned with padding
        const numericPart = format.match(/(\d+)/);
        const width = numericPart ? parseInt(numericPart[0], 10) : value.length;
        return value.padStart(width, " ");
      }

      // Default: just return the value
      return value;
    }
  );

  // Handle the SYS_CDate function for formatted dates
  // Example: <<SYS_CDate(expdate,"mm/dd/yy")>>
  result = result.replace(
    /<<SYS_CDate\(([^,]+),\s*"([^"]+)"\)>>/g,
    (match, field, format) => {
      const value = data[field] || "";

      try {
        // Parse the date
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return "N/A"; // Invalid date
        }

        // Basic date format implementation
        if (format === "mm/dd/yy") {
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const day = date.getDate().toString().padStart(2, "0");
          const year = date.getFullYear().toString().slice(2);
          return `${month}/${day}/${year}`;
        } else if (format === "yyyy-mm-dd") {
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const day = date.getDate().toString().padStart(2, "0");
          const year = date.getFullYear();
          return `${year}-${month}-${day}`;
        }

        // Default: return the raw value
        return value;
      } catch (e) {
        console.error(`Error formatting date ${value}:`, e);
        return "N/A";
      }
    }
  );

  // Handle the STR_Name function for name formatting
  // Example: <<STR_Name(title,lname,fname,mname,sname,"T F M L, S")>>
  result = result.replace(
    /<<STR_Name\(([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),\s*"([^"]+)"\)>>/g,
    (match, title, lname, fname, mname, sname, format) => {
      try {
        // Get the actual values from data
        const titleVal = data[title.trim()] || "";
        const lnameVal = data[lname.trim()] || "";
        const fnameVal = data[fname.trim()] || "";
        const mnameVal = data[mname.trim()] || "";
        const snameVal = data[sname.trim()] || "";

        // Basic implementation of name formatting
        // T F M L, S = Title FirstName MiddleName LastName, Suffix
        if (format === "T F M L, S") {
          const parts = [];
          if (titleVal) parts.push(titleVal);
          if (fnameVal) parts.push(fnameVal);
          if (mnameVal) parts.push(mnameVal);
          if (lnameVal) parts.push(lnameVal);

          let result = parts.join(" ");
          if (snameVal) result += `, ${snameVal}`;

          return result;
        } else if (format === "L, F M") {
          const nameParts = [];
          if (fnameVal) nameParts.push(fnameVal);
          if (mnameVal) nameParts.push(mnameVal);

          let result = lnameVal;
          if (nameParts.length > 0) {
            result += `, ${nameParts.join(" ")}`;
          }

          return result;
        }

        // Default: just combine the name parts
        return [titleVal, fnameVal, mnameVal, lnameVal, snameVal]
          .filter(Boolean)
          .join(" ");
      } catch (e) {
        console.error("Error formatting name:", e);
        return `${data.fname || ""} ${data.lname || ""}`;
      }
    }
  );

  // Handle the STR_MLINE function for multi-line text
  // Simplified implementation
  result = result.replace(
    /<<STR_MLINE\(([^,]+),(\d+),(\d+)\)>>/g,
    (match, field, lineNum, width) => {
      try {
        const value = data[field.trim()] || "";
        const lines = value.split("\n");
        const lineIndex = parseInt(lineNum, 10) - 1; // 1-based to 0-based
        const maxWidth = parseInt(width, 10);

        if (lineIndex >= 0 && lineIndex < lines.length) {
          const line = lines[lineIndex];
          return line.length > maxWidth ? line.substring(0, maxWidth) : line;
        }

        return "";
      } catch (e) {
        console.error("Error processing multi-line text:", e);
        return "";
      }
    }
  );

  // Handle the STR_Check function for conditional text
  // Simplified implementation
  result = result.replace(
    /<<STR_Check\((\d+),[^)]+\)>>/g,
    (match, numLines) => {
      // Simple implementation - just return the original text
      // In real implementation, we'd process the conditional logic
      return match;
    }
  );

  // Return the processed format string
  return result;
}

// Add new endpoint for printer discovery
router.get("/discover-printers", verifyToken, async (req, res) => {
  try {
    // Check if network scanning is requested (default to false as it's slow)
    const includeNetworkScan = req.query.network === "true";

    // Discover printers
    console.log(
      `Discovering printers (includeNetworkScan: ${includeNetworkScan})...`
    );
    const printers = await discoverAllPrinters(includeNetworkScan);

    // Return the results
    res.json({
      success: true,
      printers: {
        usb: printers.usb,
        network: printers.network,
        cups: printers.cups,
        all: printers.all,
      },
      counts: {
        usb: printers.usb.length,
        network: printers.network.length,
        cups: printers.cups.length,
        total: printers.all.length,
      },
    });
  } catch (error) {
    console.error("Error discovering printers:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

export default router;

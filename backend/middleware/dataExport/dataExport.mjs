import express from "express";
import {
  processMonthlyDistribution,
  generateExcelReport,
} from "./logic/wmmDataExport.mjs";
import {
  processHrgMonthlyReport,
  generateHrgExcelReport,
} from "./logic/hrgDataExport.mjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);

/**
 * Get the temporary directory path for data export files
 * @returns {string} The path to temporary DataExport folder
 */
function getDataExportPath() {
  const tempDir = path.join(__dirname, "..", "..", "temp", "DataExport");

  // Ensure the directory exists
  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  } catch (error) {
    console.error("Error creating temporary directory:", error);
    throw new Error("Unable to create temporary DataExport directory");
  }

  return tempDir;
}

/**
 * Clean up old files from the temporary directory (older than 1 hour)
 */
function cleanupOldFiles() {
  try {
    const tempDir = getDataExportPath();
    const files = fs.readdirSync(tempDir);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    files.forEach((file) => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile() && stats.mtime.getTime() < oneHourAgo) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.warn("Error during cleanup:", error);
  }
}

// Endpoint to trigger WMM data export
router.post("/generate", async (req, res) => {
  try {
    const { month, year, userId, username } = req.body;

    if (!month || !year || !userId || !username) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required parameters: month, year, userId, or username",
      });
    }

    // Get the socket ID for this user
    const socketId = global.socketIdMap.get(userId);

    // Function to emit events to the specific user
    const emitToUser = (event, data) => {
      if (socketId) {
        req.io.to(socketId).emit(event, data);
      } else {
        req.io.to(`user:${userId}`).emit(event, data);
      }
    };

    // Notify the client that export has started
    emitToUser(`export-started-${userId}`, {
      status: "started",
      message: "Data export process has started",
      progress: 0,
    });

    // Process the data
    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Connecting to database...",
      progress: 10,
    });

    const reportData = await processMonthlyDistribution(
      month,
      year,
      req.io,
      userId
    );

    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Generating Excel report...",
      progress: 80,
    });

    // Clean up old files before generating new ones
    cleanupOldFiles();

    // Generate the Excel report
    const filename = `Monthly_Report_${month}_${year}.xlsx`;
    const dataExportDir = getDataExportPath();
    const outputPath = path.join(dataExportDir, filename);

    console.log("=== EXCEL GENERATION DEBUG ===");
    console.log("DataExport directory:", dataExportDir);
    console.log("Output path:", outputPath);
    console.log("Directory exists:", fs.existsSync(dataExportDir));
    console.log("Report data keys:", Object.keys(reportData));

    try {
      await generateExcelReport(reportData, outputPath);
      console.log("✅ Excel generation completed successfully");
    } catch (excelError) {
      console.error("❌ Excel generation failed:", excelError);
      throw excelError;
    }

    // Verify the file was created
    if (!fs.existsSync(outputPath)) {
      console.error("WMM output file not found at path:", outputPath);
      throw new Error("Failed to create export file");
    }

    const fileStats = fs.statSync(outputPath);
    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Finalizing report...",
      progress: 90,
    });

    // Notify the client that export is complete
    emitToUser(`export-complete-${userId}`, {
      status: "complete",
      message: "Data export process completed successfully",
      filename: filename,
      progress: 100,
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: "Data export process completed successfully",
      filename: filename,
    });
  } catch (error) {
    console.error("Error in WMM export process:", error);
    console.error("Error stack:", error.stack);

    // Get the socket ID for this user
    const socketId = global.socketIdMap.get(req.body.userId);

    // Notify the client about the error
    if (req.body.userId) {
      if (socketId) {
        req.io.to(socketId).emit(`export-error-${req.body.userId}`, {
          status: "error",
          message: `Error: ${error.message}`,
          progress: 0,
        });
      } else {
        req.io
          .to(`user:${req.body.userId}`)
          .emit(`export-error-${req.body.userId}`, {
            status: "error",
            message: `Error: ${error.message}`,
            progress: 0,
          });
      }
    }

    res.status(500).json({
      success: false,
      message: "Error generating data export",
      error: error.message,
    });
  }
});

// Endpoint to trigger HRG data export
router.post("/generate-hrg", async (req, res) => {
  try {
    const { month, year, userId, username } = req.body;

    if (!month || !year || !userId || !username) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required parameters: month, year, userId, or username",
      });
    }

    // Get the socket ID for this user
    const socketId = global.socketIdMap.get(userId);

    // Function to emit events to the specific user
    const emitToUser = (event, data) => {
      if (socketId) {
        req.io.to(socketId).emit(event, data);
      } else {
        req.io.to(`user:${userId}`).emit(event, data);
      }
    };

    // Notify the client that export has started
    emitToUser(`export-started-${userId}`, {
      status: "started",
      message: "HRG data export process has started",
      progress: 0,
    });

    // Process the data
    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Connecting to database...",
      progress: 10,
    });

    const reportData = await processHrgMonthlyReport(
      month,
      year,
      req.io,
      userId
    );

    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Generating Excel report...",
      progress: 80,
    });

    // Clean up old files before generating new ones
    cleanupOldFiles();

    // Generate the Excel report
    const filename = `HRG_Monthly_Report_${month}_${year}.xlsx`;
    const dataExportDir = getDataExportPath();
    const outputPath = path.join(dataExportDir, filename);

    console.log("=== HRG EXCEL GENERATION DEBUG ===");
    console.log("DataExport directory:", dataExportDir);
    console.log("Output path:", outputPath);
    console.log("Directory exists:", fs.existsSync(dataExportDir));
    console.log("Report data keys:", Object.keys(reportData));

    try {
      await generateHrgExcelReport(reportData, outputPath);
      console.log("✅ HRG Excel generation completed successfully");
    } catch (excelError) {
      console.error("❌ HRG Excel generation failed:", excelError);
      throw excelError;
    }

    // Verify the file was created
    if (!fs.existsSync(outputPath)) {
      console.error("HRG output file not found at path:", outputPath);
      throw new Error("Failed to create export file");
    }

    const fileStats = fs.statSync(outputPath);

    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Finalizing report...",
      progress: 90,
    });

    // Notify the client that export is complete
    emitToUser(`export-complete-${userId}`, {
      status: "complete",
      message: "HRG data export process completed successfully",
      filename: filename,
      progress: 100,
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: "HRG data export process completed successfully",
      filename: filename,
    });
  } catch (error) {
    console.error("Error in HRG export process:", error);
    console.error("Error stack:", error.stack);

    // Get the socket ID for this user
    const socketId = global.socketIdMap.get(req.body.userId);

    // Notify the client about the error
    if (req.body.userId) {
      if (socketId) {
        req.io.to(socketId).emit(`export-error-${req.body.userId}`, {
          status: "error",
          message: `Error: ${error.message}`,
          progress: 0,
        });
      } else {
        req.io
          .to(`user:${req.body.userId}`)
          .emit(`export-error-${req.body.userId}`, {
            status: "error",
            message: `Error: ${error.message}`,
            progress: 0,
          });
      }
    }

    res.status(500).json({
      success: false,
      message: "Error generating HRG data export",
      error: error.message,
    });
  }
});

// Download endpoint for WMM reports
router.get("/download/:filename", (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid filename",
      });
    }

    const dataExportDir = getDataExportPath();
    const filePath = path.join(dataExportDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Set appropriate headers for file download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Stream the file to the client
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Error downloading file",
          });
        }
      }
    });
  } catch (error) {
    console.error("Error in download endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading file",
      error: error.message,
    });
  }
});

// Download endpoint for HRG reports
router.get("/download-hrg/:filename", (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid filename",
      });
    }

    const dataExportDir = getDataExportPath();
    const filePath = path.join(dataExportDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Set appropriate headers for file download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Stream the file to the client
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Error downloading file",
          });
        }
      }
    });
  } catch (error) {
    console.error("Error in HRG download endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading file",
      error: error.message,
    });
  }
});

export default router;

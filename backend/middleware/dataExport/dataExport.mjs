import express from "express";
import {
  processMonthlyDistribution,
  generateExcelReport,
} from "../../dataExport.mjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a temporary directory for storing export files
const tempDir = path.join(__dirname, "../../../temp_exports");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Endpoint to trigger data export
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
    console.log(`Socket ID for user ${userId}:`, socketId);

    // Function to emit events to the specific user
    const emitToUser = (event, data) => {
      console.log(`Emitting ${event} to user ${userId}:`, data);
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
      progress: 0
    });

    // Process the data
    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Connecting to database...",
      progress: 10
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
      progress: 80
    });

    // Generate the Excel report
    const filename = `Monthly_Report_${month}_${year}.xlsx`;
    const outputPath = path.join(tempDir, filename);

    await generateExcelReport(reportData, outputPath);

    // Verify the file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error("Failed to create export file");
    }

    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Finalizing report...",
      progress: 90
    });

    // Notify the client that export is complete
    emitToUser(`export-complete-${userId}`, {
      status: "complete",
      message: "Data export process completed successfully",
      filename: filename,
      progress: 100
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: "Data export process completed successfully",
      filename: filename
    });
  } catch (error) {
    console.error("Error generating data export:", error);

    // Get the socket ID for this user
    const socketId = global.socketIdMap.get(req.body.userId);
    console.log(`Socket ID for user ${req.body.userId} (error):`, socketId);

    // Notify the client about the error
    if (req.body.userId) {
      if (socketId) {
        req.io.to(socketId).emit(`export-error-${req.body.userId}`, {
          status: "error",
          message: `Error: ${error.message}`,
          progress: 0
        });
      } else {
        req.io.to(`user:${req.body.userId}`).emit(`export-error-${req.body.userId}`, {
          status: "error",
          message: `Error: ${error.message}`,
          progress: 0
        });
      }
    }

    res.status(500).json({
      success: false,
      message: "Error generating data export",
      error: error.message
    });
  }
});

// Endpoint to download the generated file
router.get("/download/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(tempDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Send the file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
      }

      // Delete the file after download (optional)
      // fs.unlink(filePath, (unlinkErr) => {
      //   if (unlinkErr) console.error("Error deleting file:", unlinkErr);
      // });
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading file",
      error: error.message,
    });
  }
});

// Endpoint to clean up old files (can be called periodically)
router.post("/cleanup", (req, res) => {
  try {
    const files = fs.readdirSync(tempDir);
    const now = new Date();

    // Delete files older than 24 hours
    files.forEach((file) => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = (now - stats.mtime) / (1000 * 60 * 60); // in hours

      if (fileAge > 24) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old file: ${file}`);
      }
    });

    res.status(200).json({
      success: true,
      message: "Cleanup completed successfully",
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    res.status(500).json({
      success: false,
      message: "Error during cleanup",
      error: error.message,
    });
  }
});

export default router;

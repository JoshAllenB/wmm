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
const __dirname = path.dirname(__filename);

// Create a temporary directory for storing export files
const tempDir = path.join(__dirname, "../../../temp_exports");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Endpoint to trigger WMM data export
router.post("/generate", async (req, res) => {
  try {
    const { month, year, userId, username } = req.body;

    console.log('Starting WMM export process:', { month, year, userId, username });

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

    console.log('Processing WMM monthly distribution data...');
    const reportData = await processMonthlyDistribution(
      month,
      year,
      req.io,
      userId
    );
    console.log('WMM data processed successfully');

    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Generating Excel report...",
      progress: 80
    });

    // Generate the Excel report
    const filename = `Monthly_Report_${month}_${year}.xlsx`;
    const outputPath = path.join(tempDir, filename);
    
    console.log('Generating WMM Excel report:', {
      filename,
      outputPath,
      tempDir,
      dataSize: reportData ? Object.keys(reportData).length : 0
    });

    await generateExcelReport(reportData, outputPath);
    console.log('WMM Excel report generated');

    // Verify the file was created
    if (!fs.existsSync(outputPath)) {
      console.error('WMM output file not found at path:', outputPath);
      throw new Error("Failed to create export file");
    }
    
    const fileStats = fs.statSync(outputPath);
    console.log('WMM file created successfully:', {
      path: outputPath,
      size: fileStats.size,
      created: fileStats.birthtime,
      modified: fileStats.mtime
    });

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
    console.error("Error in WMM export process:", error);
    console.error("Error stack:", error.stack);

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

// Endpoint to trigger HRG data export
router.post("/generate-hrg", async (req, res) => {
  try {
    const { month, year, userId, username } = req.body;
    
    console.log('Starting HRG export process:', { month, year, userId, username });

    if (!month || !year || !userId || !username) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: month, year, userId, or username",
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
      message: "HRG data export process has started",
      progress: 0
    });

    // Process the data
    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Connecting to database...",
      progress: 10
    });

    console.log('Processing HRG monthly report data...');
    const reportData = await processHrgMonthlyReport(
      month,
      year,
      req.io,
      userId
    );
    console.log('HRG data processed successfully');

    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Generating Excel report...",
      progress: 80
    });

    // Generate the Excel report
    const filename = `HRG_Monthly_Report_${month}_${year}.xlsx`;
    const outputPath = path.join(tempDir, filename);
    
    console.log('Generating HRG Excel report:', {
      filename,
      outputPath,
      tempDir,
      dataSize: reportData ? Object.keys(reportData).length : 0
    });

    await generateHrgExcelReport(reportData, outputPath);
    console.log('HRG Excel report generated');

    // Verify the file was created
    if (!fs.existsSync(outputPath)) {
      console.error('HRG output file not found at path:', outputPath);
      throw new Error("Failed to create export file");
    }
    
    const fileStats = fs.statSync(outputPath);
    console.log('HRG file created successfully:', {
      path: outputPath,
      size: fileStats.size,
      created: fileStats.birthtime,
      modified: fileStats.mtime
    });

    emitToUser(`export-progress-${userId}`, {
      status: "progress",
      message: "Finalizing report...",
      progress: 90
    });

    // Notify the client that export is complete
    emitToUser(`export-complete-${userId}`, {
      status: "complete",
      message: "HRG data export process completed successfully",
      filename: filename,
      progress: 100
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: "HRG data export process completed successfully",
      filename: filename
    });
  } catch (error) {
    console.error("Error in HRG export process:", error);
    console.error("Error stack:", error.stack);

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
      message: "Error generating HRG data export",
      error: error.message
    });
  }
});

// Endpoint to download the generated file
router.get("/download/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(tempDir, filename);
    
    console.log('Download request received:', {
      filename,
      filePath,
      exists: fs.existsSync(filePath)
    });

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found for download:', filePath);
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const fileStats = fs.statSync(filePath);
    console.log('Preparing to download file:', {
      path: filePath,
      size: fileStats.size,
      modified: fileStats.mtime
    });

    // Send the file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error("Error during file download:", err);
        console.error("Error stack:", err.stack);
      } else {
        console.log('File download completed successfully:', filename);
      }

      // Delete the file after download (optional)
      // fs.unlink(filePath, (unlinkErr) => {
      //   if (unlinkErr) console.error("Error deleting file:", unlinkErr);
      // });
    });
  } catch (error) {
    console.error("Error in download endpoint:", error);
    console.error("Error stack:", error.stack);
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

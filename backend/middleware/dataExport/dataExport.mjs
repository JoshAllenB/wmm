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

    // Notify the client that export has started
    req.io.emit(`export-started-${userId}`, {
      status: "started",
      message: "Data export process has started",
    });

    // Process the data
    const reportData = await processMonthlyDistribution(
      month,
      year,
      req.io,
      userId
    );

    // Generate a unique filename for this user
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `Monthly_Report_${month}_${year}.xlsx`;
    const outputPath = path.join(tempDir, filename);

    // Generate the Excel report
    await generateExcelReport(reportData, outputPath);

    // Notify the client that export is complete
    req.io.emit(`export-complete-${userId}`, {
      status: "complete",
      message: "Data export process completed successfully",
      filename: filename,
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: "Data export process completed successfully",
      filename: filename,
    });
  } catch (error) {
    console.error("Error generating data export:", error);

    // Notify the client about the error
    if (req.body.userId) {
      req.io.emit(`export-error-${req.body.userId}`, {
        status: "error",
        message: `Error: ${error.message}`,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error generating data export",
      error: error.message,
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

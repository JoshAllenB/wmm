/**
 * Database Backup API Routes
 *
 * Provides REST API endpoints for database backup management:
 * - Manual backup triggers
 * - Backup listing and management
 * - Backup download
 * - Backup cleanup
 */

import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import {
  createFullBackup,
  createDatabaseBackup,
  listBackups,
  cleanupOldBackups,
  createBackupArchive,
  restoreDatabaseFromBackup,
  restoreFullBackup,
  validateBackupForRestore,
  validateRestoreWithSafety,
  CONFIG,
} from "../../utils/database-backup.mjs";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(CONFIG.BACKUP_BASE_PATH, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `uploaded_${timestamp}_${originalName}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow zip files
    if (
      file.mimetype === "application/zip" ||
      file.originalname.toLowerCase().endsWith(".zip")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only ZIP files are allowed for backup uploads"), false);
    }
  },
});

// Middleware to log backup API requests
const logRequest = (req, res, next) => {
  console.log(`[Backup API] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });
  next();
};

router.use(logRequest);

/**
 * @route GET /api/backup/status
 * @desc Get backup service status and configuration
 */
router.get("/status", async (req, res) => {
  try {
    const backups = listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);

    res.json({
      success: true,
      status: "running",
      config: {
        databases: CONFIG.MONGODB_DATABASES,
        backupPath: CONFIG.BACKUP_BASE_PATH,
        maxBackups: CONFIG.MAX_BACKUPS,
        compression: CONFIG.COMPRESSION,
        autosaveEnabled: CONFIG.AUTOSAVE_ENABLED,
        autosaveSchedule: CONFIG.AUTOSAVE_SCHEDULE,
      },
      stats: {
        totalBackups: backups.length,
        totalSize: totalSize,
        totalSizeFormatted: formatBytes(totalSize),
      },
    });
  } catch (error) {
    console.error("Error getting backup status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get backup status",
      message: error.message,
    });
  }
});

/**
 * @route GET /api/backup/connection-test
 * @desc Test MongoDB connection for all configured databases
 */
router.get("/connection-test", async (req, res) => {
  try {
    const { testMongoDBConnection } = await import(
      "../../utils/database-backup.mjs"
    );
    const results = {};

    for (const database of CONFIG.MONGODB_DATABASES) {
      try {
        const result = await testMongoDBConnection(
          CONFIG.MONGODB_URI,
          database
        );
        results[database] = {
          success: result.success,
          error: result.error || null,
          message: result.success
            ? "Connection successful"
            : "Connection failed",
        };
      } catch (error) {
        results[database] = {
          success: false,
          error: error.message,
          message: "Connection test failed",
        };
      }
    }

    const allSuccessful = Object.values(results).every((r) => r.success);

    res.json({
      success: allSuccessful,
      message: allSuccessful
        ? "All database connections successful"
        : "Some database connections failed",
      results,
      mongodbUri: CONFIG.MONGODB_URI.replace(/\/\/.*@/, "//***@"), // Hide credentials
    });
  } catch (error) {
    console.error("Error testing MongoDB connections:", error);
    res.status(500).json({
      success: false,
      error: "Failed to test MongoDB connections",
      message: error.message,
    });
  }
});

/**
 * @route GET /api/backup/list
 * @desc List all available backups
 */
router.get("/list", async (req, res) => {
  try {
    const backups = listBackups();

    res.json({
      success: true,
      backups: backups.map((backup) => ({
        id: backup.id,
        type: backup.type,
        timestamp: backup.timestamp,
        size: backup.size,
        sizeFormatted: backup.sizeFormatted,
        path: backup.path,
      })),
    });
  } catch (error) {
    console.error("Error listing backups:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list backups",
      message: error.message,
    });
  }
});

/**
 * @route POST /api/backup/create
 * @desc Create a new backup (manual trigger)
 */
router.post("/create", async (req, res) => {
  try {
    const { type = "manual", database, options = {} } = req.body;

    let result;
    if (database) {
      // Backup specific database
      if (!CONFIG.MONGODB_DATABASES.includes(database)) {
        return res.status(400).json({
          success: false,
          error: "Invalid database",
          message: `Database '${database}' is not in the configured list: ${CONFIG.MONGODB_DATABASES.join(
            ", "
          )}`,
        });
      }
      result = await createDatabaseBackup(database, type, options);
    } else {
      // Backup all databases
      result = await createFullBackup(type, options);
    }

    res.json({
      success: true,
      message: "Backup created successfully",
      backup: result,
    });
  } catch (error) {
    console.error("Error creating backup:", error);

    // Provide more specific error messages based on error type
    let errorMessage = "Failed to create backup";
    let statusCode = 500;

    if (error.message.includes("MongoDB connection failed")) {
      errorMessage =
        "MongoDB connection failed. Please check if MongoDB is running and accessible.";
      statusCode = 503; // Service Unavailable
    } else if (error.message.includes("server selection timeout")) {
      errorMessage =
        "MongoDB server is not responding. Please check if MongoDB is running.";
      statusCode = 503;
    } else if (error.message.includes("replicaSet")) {
      errorMessage =
        "MongoDB replica set configuration issue. Please check your MongoDB setup.";
      statusCode = 503;
    } else if (error.message.includes("authentication failed")) {
      errorMessage =
        "MongoDB authentication failed. Please check your credentials.";
      statusCode = 401;
    } else if (error.message.includes("permission denied")) {
      errorMessage =
        "Insufficient permissions to access MongoDB. Please check your user privileges.";
      statusCode = 403;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * @route POST /api/backup/create-full
 * @desc Create a full backup of all databases
 */
router.post("/create-full", async (req, res) => {
  try {
    const { type = "manual", options = {} } = req.body;
    const result = await createFullBackup(type, options);

    res.json({
      success: true,
      message: "Full backup created successfully",
      backup: result,
    });
  } catch (error) {
    console.error("Error creating full backup:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create full backup",
      message: error.message,
    });
  }
});

/**
 * @route POST /api/backup/create-database
 * @desc Create a backup of a specific database
 */
router.post("/create-database", async (req, res) => {
  try {
    const { database, type = "manual", options = {} } = req.body;

    if (!database) {
      return res.status(400).json({
        success: false,
        error: "Database name is required",
      });
    }

    if (!CONFIG.MONGODB_DATABASES.includes(database)) {
      return res.status(400).json({
        success: false,
        error: "Invalid database",
        message: `Database '${database}' is not in the configured list: ${CONFIG.MONGODB_DATABASES.join(
          ", "
        )}`,
      });
    }

    const result = await createDatabaseBackup(database, type, options);

    res.json({
      success: true,
      message: `Backup created successfully for database: ${database}`,
      backup: result,
    });
  } catch (error) {
    console.error("Error creating database backup:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create database backup",
      message: error.message,
    });
  }
});

/**
 * @route GET /api/backup/download/:backupId
 * @desc Download a backup as a compressed archive
 */
router.get("/download/:backupId", async (req, res) => {
  try {
    const { backupId } = req.params;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: "Backup ID is required",
      });
    }

    // Create archive
    const archive = await createBackupArchive(backupId);

    // Set headers for file download (ZIP format)
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${backupId}.zip"`
    );
    res.setHeader("Content-Length", archive.size);

    // Stream the file
    const fileStream = fs.createReadStream(archive.path);

    fileStream.on("error", (error) => {
      console.error("Error streaming backup file:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Failed to stream backup file",
          message: error.message,
        });
      }
    });

    fileStream.on("end", () => {
      // Clean up temporary archive file
      fs.unlink(archive.path, (err) => {
        if (err) {
          console.error("Error cleaning up temporary archive:", err);
        }
      });
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error("Error downloading backup:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download backup",
      message: error.message,
    });
  }
});

/**
 * @route DELETE /api/backup/:backupId
 * @desc Delete a specific backup
 */
router.delete("/:backupId", async (req, res) => {
  try {
    const { backupId } = req.params;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: "Backup ID is required",
      });
    }

    const backups = listBackups();
    const backup = backups.find((b) => b.id === backupId);

    if (!backup) {
      return res.status(404).json({
        success: false,
        error: "Backup not found",
      });
    }

    // Delete backup directory
    fs.rmSync(backup.path, { recursive: true, force: true });

    res.json({
      success: true,
      message: `Backup ${backupId} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting backup:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete backup",
      message: error.message,
    });
  }
});

/**
 * @route POST /api/backup/cleanup
 * @desc Clean up old backups (keep only the most recent ones)
 */
router.post("/cleanup", async (req, res) => {
  try {
    const result = cleanupOldBackups();

    res.json({
      success: true,
      message: "Cleanup completed",
      result,
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cleanup backups",
      message: error.message,
    });
  }
});

/**
 * @route GET /api/backup/info/:backupId
 * @desc Get detailed information about a specific backup
 */
router.get("/info/:backupId", async (req, res) => {
  try {
    const { backupId } = req.params;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: "Backup ID is required",
      });
    }

    const backups = listBackups();
    const backup = backups.find((b) => b.id === backupId);

    if (!backup) {
      return res.status(404).json({
        success: false,
        error: "Backup not found",
      });
    }

    // Get detailed file information
    const backupPath = backup.path;
    const files = [];

    function scanDirectory(dirPath, relativePath = "") {
      const items = fs.readdirSync(dirPath);

      items.forEach((item) => {
        const itemPath = path.join(dirPath, item);
        const itemRelativePath = path.join(relativePath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          scanDirectory(itemPath, itemRelativePath);
        } else {
          files.push({
            name: itemRelativePath,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            modified: stats.mtime,
          });
        }
      });
    }

    scanDirectory(backupPath);

    res.json({
      success: true,
      backup: {
        ...backup,
        files,
        fileCount: files.length,
      },
    });
  } catch (error) {
    console.error("Error getting backup info:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get backup information",
      message: error.message,
    });
  }
});

/**
 * @route POST /api/backup/restore/:backupId
 * @desc Restore database(s) from a backup
 */
router.post("/restore/:backupId", async (req, res) => {
  try {
    const { backupId } = req.params;
    const {
      database,
      drop = false,
      excludeCollections = [],
      includeCollections = [],
      skipSafetyCheck = false,
      force = false,
    } = req.body;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: "Backup ID is required",
      });
    }

    // Perform safety validation unless skipped
    if (!skipSafetyCheck && !force) {
      const safetyValidation = await validateRestoreWithSafety(
        backupId,
        database,
        {
          skipConfirmation: true,
          force: false,
        }
      );

      if (!safetyValidation.valid) {
        return res.status(400).json({
          success: false,
          error: safetyValidation.error,
          safetyChecks: safetyValidation.safetyChecks,
        });
      }

      // Check if confirmation is required
      if (safetyValidation.requiresConfirmation) {
        return res.status(400).json({
          success: false,
          error: "Safety validation requires confirmation",
          message:
            "This restore operation may overwrite existing data. Please confirm before proceeding.",
          safetyChecks: safetyValidation.safetyChecks,
          requiresConfirmation: true,
        });
      }
    }

    let result;
    if (database) {
      // Restore specific database
      if (!CONFIG.MONGODB_DATABASES.includes(database)) {
        return res.status(400).json({
          success: false,
          error: "Invalid database",
          message: `Database '${database}' is not in the configured list: ${CONFIG.MONGODB_DATABASES.join(
            ", "
          )}`,
        });
      }
      result = await restoreDatabaseFromBackup(backupId, database, {
        drop,
        excludeCollections,
        includeCollections,
      });
    } else {
      // Restore all databases
      result = await restoreFullBackup(backupId, {
        drop,
        excludeCollections,
        includeCollections,
      });
    }

    res.json({
      success: true,
      message: database
        ? `Database ${database} restored successfully from backup ${backupId}`
        : `All databases restored successfully from backup ${backupId}`,
      restore: result,
    });
  } catch (error) {
    console.error("Error restoring from backup:", error);

    // Provide more specific error messages based on error type
    let errorMessage = "Failed to restore from backup";
    let statusCode = 500;

    if (error.message.includes("MongoDB connection failed")) {
      errorMessage =
        "MongoDB connection failed. Please check if MongoDB is running and accessible.";
      statusCode = 503; // Service Unavailable
    } else if (error.message.includes("server selection timeout")) {
      errorMessage =
        "MongoDB server is not responding. Please check if MongoDB is running.";
      statusCode = 503;
    } else if (error.message.includes("replicaSet")) {
      errorMessage =
        "MongoDB replica set configuration issue. Please check your MongoDB setup.";
      statusCode = 503;
    } else if (error.message.includes("authentication failed")) {
      errorMessage =
        "MongoDB authentication failed. Please check your credentials.";
      statusCode = 401;
    } else if (error.message.includes("permission denied")) {
      errorMessage =
        "Insufficient permissions to access MongoDB. Please check your user privileges.";
      statusCode = 403;
    } else if (error.message.includes("not found")) {
      errorMessage = error.message;
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * @route POST /api/backup/restore-database/:backupId
 * @desc Restore a specific database from a backup
 */
router.post("/restore-database/:backupId", async (req, res) => {
  try {
    const { backupId } = req.params;
    const {
      database,
      drop = false,
      excludeCollections = [],
      includeCollections = [],
    } = req.body;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: "Backup ID is required",
      });
    }

    if (!database) {
      return res.status(400).json({
        success: false,
        error: "Database name is required",
      });
    }

    if (!CONFIG.MONGODB_DATABASES.includes(database)) {
      return res.status(400).json({
        success: false,
        error: "Invalid database",
        message: `Database '${database}' is not in the configured list: ${CONFIG.MONGODB_DATABASES.join(
          ", "
        )}`,
      });
    }

    // Validate backup before restore
    const validation = validateBackupForRestore(backupId, database);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const result = await restoreDatabaseFromBackup(backupId, database, {
      drop,
      excludeCollections,
      includeCollections,
    });

    res.json({
      success: true,
      message: `Database ${database} restored successfully from backup ${backupId}`,
      restore: result,
    });
  } catch (error) {
    console.error("Error restoring database from backup:", error);
    res.status(500).json({
      success: false,
      error: "Failed to restore database from backup",
      message: error.message,
    });
  }
});

/**
 * @route POST /api/backup/restore-full/:backupId
 * @desc Restore all databases from a full backup
 */
router.post("/restore-full/:backupId", async (req, res) => {
  try {
    const { backupId } = req.params;
    const {
      drop = false,
      excludeCollections = [],
      includeCollections = [],
    } = req.body;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: "Backup ID is required",
      });
    }

    // Validate backup before restore
    const validation = validateBackupForRestore(backupId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const result = await restoreFullBackup(backupId, {
      drop,
      excludeCollections,
      includeCollections,
    });

    res.json({
      success: true,
      message: `All databases restored successfully from backup ${backupId}`,
      restore: result,
    });
  } catch (error) {
    console.error("Error restoring full backup:", error);
    res.status(500).json({
      success: false,
      error: "Failed to restore full backup",
      message: error.message,
    });
  }
});

/**
 * @route GET /api/backup/validate/:backupId
 * @desc Validate a backup for restore operations
 */
router.get("/validate/:backupId", async (req, res) => {
  try {
    const { backupId } = req.params;
    const { database } = req.query;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: "Backup ID is required",
      });
    }

    const validation = validateBackupForRestore(backupId, database);

    res.json({
      success: true,
      validation,
    });
  } catch (error) {
    console.error("Error validating backup:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate backup",
      message: error.message,
    });
  }
});

/**
 * @route GET /api/backup/safety-check/:backupId
 * @desc Perform comprehensive safety validation before restore
 */
router.get("/safety-check/:backupId", async (req, res) => {
  try {
    const { backupId } = req.params;
    const { database, skipConfirmation = false, force = false } = req.query;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: "Backup ID is required",
      });
    }

    const validation = await validateRestoreWithSafety(backupId, database, {
      skipConfirmation: skipConfirmation === "true",
      force: force === "true",
    });

    res.json({
      success: validation.valid,
      validation,
    });
  } catch (error) {
    console.error("Error performing safety check:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform safety check",
      message: error.message,
    });
  }
});

/**
 * @route POST /api/backup/upload
 * @desc Upload a backup file (.zip) to restore from
 */
router.post("/upload", upload.single("backupFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No backup file provided",
        message: "Please select a ZIP file to upload",
      });
    }

    const uploadedFile = req.file;
    const { backupName, description } = req.body;

    // Validate the uploaded file
    if (!uploadedFile.originalname.toLowerCase().endsWith(".zip")) {
      // Clean up the uploaded file
      fs.unlinkSync(uploadedFile.path);
      return res.status(400).json({
        success: false,
        error: "Invalid file type",
        message: "Only ZIP files are allowed for backup uploads",
      });
    }

    // Generate a backup ID for the uploaded file
    const backupId = `uploaded_${Date.now()}`;
    const backupDir = path.join(CONFIG.BACKUP_BASE_PATH, backupId);

    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Move the uploaded file to the backup directory
    const finalBackupPath = path.join(backupDir, "backup.zip");
    fs.renameSync(uploadedFile.path, finalBackupPath);

    // Create backup metadata
    const backupMetadata = {
      id: backupId,
      type: "uploaded",
      timestamp: new Date().toISOString(),
      size: uploadedFile.size,
      sizeFormatted: formatBytes(uploadedFile.size),
      originalName: uploadedFile.originalname,
      backupName: backupName || uploadedFile.originalname,
      description: description || "Uploaded backup file",
      path: backupDir,
      filePath: finalBackupPath,
      uploaded: true,
    };

    // Save metadata to a JSON file
    const metadataPath = path.join(backupDir, "metadata.json");
    fs.writeFileSync(metadataPath, JSON.stringify(backupMetadata, null, 2));

    console.log(`[Backup API] Backup uploaded successfully: ${backupId}`);

    res.json({
      success: true,
      message: "Backup uploaded successfully",
      backup: backupMetadata,
    });
  } catch (error) {
    console.error("Error uploading backup:", error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up uploaded file:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: "Failed to upload backup",
      message: error.message,
    });
  }
});

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default router;

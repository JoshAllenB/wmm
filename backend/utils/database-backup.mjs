/**
 * Database Backup Service
 *
 * Provides comprehensive MongoDB backup functionality including:
 * - mongodump for safe backups while MongoDB is running
 * - Autosave functionality with configurable intervals
 * - Manual backup triggers
 * - Backup management and cleanup
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import cron from "node-cron";
import { fileURLToPath } from "url";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { createGzip } from "zlib";
import yauzl from "yauzl";
import archiver from "archiver";
import { EventEmitter } from "events";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a backup event emitter for standalone usage
const backupEventEmitter = new EventEmitter();

// Helper function to emit backup events
function emitBackupEvent(eventName, data) {
  // Try WebSocket first (when running as part of main server)
  if (global.io) {
    global.io.emit(eventName, data);
  } else {
    // Fallback to event emitter (when running standalone)
    backupEventEmitter.emit(eventName, data);

    // Add a small delay to ensure WebSocket connection is ready
    if (eventName === "backup-started") {
      setTimeout(() => {
        backupEventEmitter.emit(eventName, data);
      }, 1000);
    }
  }
}

// Configuration
const CONFIG = {
  // MongoDB connection details
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017",
  MONGODB_DATABASES: ["wmm_client", "wmm_user"],

  // Backup paths
  BACKUP_BASE_PATH: process.env.BACKUP_PATH || getDefaultBackupPath(),
  TEMP_BACKUP_PATH: path.join(process.cwd(), "temp", "backups"),

  // Backup settings
  MAX_BACKUPS: parseInt(process.env.MAX_BACKUPS) || 10,
  COMPRESSION: process.env.BACKUP_COMPRESSION !== "false", // default true
  AUTOSAVE_ENABLED: process.env.AUTOSAVE_ENABLED !== "false", // default true
  AUTOSAVE_SCHEDULE: process.env.AUTOSAVE_SCHEDULE || "0 12 * * *", // Daily at 12 PM noon local time

  // Logging
  LOG_FILE: path.join(process.cwd(), "backup.log"),
};

// Ensure backup directories exist
function ensureDirectories() {
  const dirs = [CONFIG.BACKUP_BASE_PATH, CONFIG.TEMP_BACKUP_PATH];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Logger
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine =
    `[${timestamp}] ${message}` + (data ? ` | ${JSON.stringify(data)}` : "");

  // Write to log file
  fs.appendFileSync(CONFIG.LOG_FILE, logLine + "\n", "utf8");

  // Only log to console for important events
  if (
    message.includes("Backup created") ||
    message.includes("Backup failed") ||
    message.includes("Cleanup completed") ||
    message.includes("service initialized")
  ) {
    console.log(logLine);
  }
}

// Get default backup path based on environment
function getDefaultBackupPath() {
  // Check if we're in WSL environment
  if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
    // WSL environment - use simple Windows directory structure
    return `/mnt/c/mongo_backups`;
  }

  // Check if we're on Windows
  if (process.platform === "win32") {
    return `C:\\mongo_backups`;
  }

  // Linux/macOS - use home directory
  const homeDir = os.homedir();
  return path.join(homeDir, "mongo_backups");
}

// Fix MongoDB URI for backup operations
function fixMongoDBURI(uri) {
  try {
    const url = new URL(uri);

    // If replica set is specified but we're having connection issues,
    // try without replica set for backup operations
    if (url.searchParams.has("replicaSet")) {
      // Create a fallback URI without replica set
      const fallbackUri = `${url.protocol}//${url.host}`;
      return {
        primary: uri,
        fallback: fallbackUri,
      };
    }

    return {
      primary: uri,
      fallback: uri,
    };
  } catch (error) {
    return {
      primary: uri,
      fallback: "mongodb://localhost:27017",
    };
  }
}

// Test MongoDB connection
async function testMongoDBConnection(uri, database) {
  try {
    const testCommand = `mongosh --quiet --eval "db.runCommand('ping')" "${uri}/${database}"`;
    const { stdout, stderr } = await execAsync(testCommand, { timeout: 10000 });

    if (stdout.includes("ok") || stdout.includes("1")) {
      return { success: true, stdout, stderr };
    } else {
      return { success: false, stdout, stderr };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get current Windows username for backup path
function getWindowsUsername() {
  try {
    // Try to get from environment variables
    const username =
      process.env.USERNAME || process.env.USER || os.userInfo().username;
    return username;
  } catch (error) {
    return "user"; // fallback
  }
}

// Update backup path with actual username (for WSL compatibility)
function updateBackupPath() {
  // Only update if not explicitly set via environment
  if (!process.env.BACKUP_PATH) {
    CONFIG.BACKUP_BASE_PATH = getDefaultBackupPath();
    ensureDirectories();
  }
}

// Generate backup filename with timestamp
function generateBackupFilename(database, type = "manual") {
  const timestamp = new Date()
    .toLocaleString("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/[:.]/g, "-")
    .replace(/,/g, "")
    .replace(/\s/g, "_");
  const suffix = CONFIG.COMPRESSION ? ".gz" : "";
  return `${database}_${type}_${timestamp}${suffix}`;
}

// Execute mongodump command
async function executeMongodump(database, outputPath, options = {}) {
  const {
    compression = CONFIG.COMPRESSION,
    excludeCollections = [],
    includeCollections = [],
  } = options;

  // Get MongoDB URI options (primary and fallback)
  const uriOptions = fixMongoDBURI(CONFIG.MONGODB_URI);

  // Try primary URI first, then fallback if it fails
  const urisToTry = [uriOptions.primary, uriOptions.fallback];

  for (let i = 0; i < urisToTry.length; i++) {
    const uri = urisToTry[i];
    const isFallback = i > 0;

    // Test connection first (skip for fallback if primary test passed)
    if (i === 0 || (i === 1 && urisToTry[0] !== urisToTry[1])) {
      const connectionTest = await testMongoDBConnection(uri, database);
      if (!connectionTest.success) {
        if (i === urisToTry.length - 1) {
          throw new Error(
            `MongoDB connection failed for all URIs. Last error: ${
              connectionTest.error || "Connection test failed"
            }`
          );
        }
        continue;
      }
    }

    let command = `mongodump --uri="${uri}/${database}" --out="${outputPath}"`;

    // Add compression if enabled
    if (compression) {
      command += " --gzip";
    }

    // Add collection filters
    if (excludeCollections.length > 0) {
      excludeCollections.forEach((collection) => {
        command += ` --excludeCollection="${collection}"`;
      });
    }

    if (includeCollections.length > 0) {
      includeCollections.forEach((collection) => {
        command += ` --collection="${collection}"`;
      });
    }

    // Execute mongodump command

    try {
      const { stdout, stderr } = await execAsync(command);
      return {
        success: true,
        stdout,
        stderr,
        uri: uri.replace(/\/\/.*@/, "//***@"),
      };
    } catch (error) {
      // If this is the last attempt, throw the error
      if (i === urisToTry.length - 1) {
        throw new Error(
          `Mongodump failed for ${database} after ${urisToTry.length} attempts. Last error: ${error.message}`
        );
      }
    }
  }
}

// Create backup for a single database
async function createDatabaseBackup(database, type = "manual", options = {}) {
  const timestamp = new Date();
  const dateStr = timestamp.toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  }); // YYYY-MM-DD
  const timeStr = timestamp
    .toLocaleTimeString("en-CA", {
      timeZone: "Asia/Manila",
      hour12: false,
    })
    .slice(0, 5)
    .replace(":", "-"); // HH-MM
  const backupId = `wmm_backup(${dateStr}_${timeStr})_${database}`;

  try {
    // Emit backup start event to all connected clients
    emitBackupEvent("backup-started", {
      type: type,
      message: `Backup started for ${database}`,
      database: database,
      timestamp: new Date().toISOString(),
    });

    // Create temporary directory for this backup
    const tempDir = path.join(CONFIG.TEMP_BACKUP_PATH, backupId);
    fs.mkdirSync(tempDir, { recursive: true });

    // Execute mongodump
    await executeMongodump(database, tempDir, options);

    // Create final backup directory
    const backupDir = path.join(CONFIG.BACKUP_BASE_PATH, backupId);
    fs.mkdirSync(backupDir, { recursive: true });

    // Move backup files to final location
    const sourceDir = path.join(tempDir, database);
    if (fs.existsSync(sourceDir)) {
      // Copy all files from source to destination
      const files = fs.readdirSync(sourceDir);
      files.forEach((file) => {
        const sourceFile = path.join(sourceDir, file);
        const destFile = path.join(backupDir, file);
        fs.copyFileSync(sourceFile, destFile);
      });
    }

    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Get backup size
    const backupSize = getDirectorySize(backupDir);

    const backupInfo = {
      id: backupId,
      database,
      type,
      timestamp,
      path: backupDir,
      size: backupSize,
      compressed: CONFIG.COMPRESSION,
    };

    log(`Backup created successfully`, backupInfo);

    // Emit backup completion event to all connected clients
    emitBackupEvent("backup-completed", {
      type: type,
      message: `Backup completed for ${database}`,
      database: database,
      timestamp: new Date().toISOString(),
      backupId: backupInfo.id,
      size: backupInfo.size,
      sizeFormatted: formatBytes(backupInfo.size),
      successCount: 1,
      totalDatabases: 1,
    });

    // Trigger cleanup for manual backups
    if (type === "manual") {
      cleanupOldBackups();
    }

    return backupInfo;
  } catch (error) {
    log(`Backup failed for database ${database}`, {
      error: error.message,
      type,
      database,
    });

    // Emit backup error event to all connected clients
    emitBackupEvent("backup-error", {
      type: type,
      message: `Backup failed for ${database}`,
      database: database,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

// Create backup for all configured databases (consolidated)
async function createFullBackup(type = "manual", options = {}) {
  const timestamp = new Date();
  const dateStr = timestamp.toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  }); // YYYY-MM-DD
  const timeStr = timestamp
    .toLocaleTimeString("en-CA", {
      timeZone: "Asia/Manila",
      hour12: false,
    })
    .slice(0, 5)
    .replace(":", "-"); // HH-MM
  const backupId = `wmm_backup(${dateStr}_${timeStr})`;

  try {
    // Emit backup start event to all connected clients
    emitBackupEvent("backup-started", {
      type: type,
      message: "Full backup started",
      timestamp: new Date().toISOString(),
    });

    // Create consolidated backup directory
    const consolidatedBackupDir = path.join(CONFIG.BACKUP_BASE_PATH, backupId);
    fs.mkdirSync(consolidatedBackupDir, { recursive: true });

    const results = [];
    let totalSize = 0;

    for (const database of CONFIG.MONGODB_DATABASES) {
      try {
        // Create temporary directory for this database
        const tempDir = path.join(
          CONFIG.TEMP_BACKUP_PATH,
          `${backupId}_${database}`
        );
        fs.mkdirSync(tempDir, { recursive: true });

        // Execute mongodump for this database
        await executeMongodump(database, tempDir, options);

        // Copy database backup to consolidated directory
        const sourceDir = path.join(tempDir, database);
        const destDir = path.join(consolidatedBackupDir, database);

        if (fs.existsSync(sourceDir)) {
          // Use copy instead of rename to handle cross-device links
          await copyDirectory(sourceDir, destDir);
          const dbSize = getDirectorySize(destDir);
          totalSize += dbSize;

          results.push({
            database,
            success: true,
            size: dbSize,
            path: destDir,
          });

          // Database added to consolidated backup
        }

        // Clean up temporary directory
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        results.push({
          database,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success !== false).length;

    // Create backup metadata file
    const metadata = {
      id: backupId,
      type,
      timestamp,
      databases: CONFIG.MONGODB_DATABASES,
      results,
      successCount,
      totalSize,
      created: new Date().toISOString(),
      version: "1.0",
    };

    fs.writeFileSync(
      path.join(consolidatedBackupDir, "backup_metadata.json"),
      JSON.stringify(metadata, null, 2)
    );

    log(`Consolidated backup completed`, {
      successCount,
      totalDatabases: CONFIG.MONGODB_DATABASES.length,
      totalSize: formatBytes(totalSize),
      backupPath: consolidatedBackupDir,
    });

    // Emit backup completion event to all connected clients
    emitBackupEvent("backup-completed", {
      type: type,
      message: "Full backup completed successfully",
      timestamp: new Date().toISOString(),
      backupId: backupId,
      size: totalSize,
      sizeFormatted: formatBytes(totalSize),
      successCount: successCount,
      totalDatabases: CONFIG.MONGODB_DATABASES.length,
    });

    // Trigger cleanup for manual backups
    if (type === "manual") {
      cleanupOldBackups();
    }

    return {
      id: backupId,
      type,
      timestamp,
      path: consolidatedBackupDir,
      size: totalSize,
      results,
      successCount,
      totalSize,
    };
  } catch (error) {
    log(`Full backup failed`, { error: error.message });

    // Emit backup error event to all connected clients
    emitBackupEvent("backup-error", {
      type: type,
      message: "Full backup failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

// Copy directory recursively
async function copyDirectory(source, destination) {
  try {
    // Create destination directory
    fs.mkdirSync(destination, { recursive: true });

    // Read source directory
    const items = fs.readdirSync(source);

    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      const stats = fs.statSync(sourcePath);

      if (stats.isDirectory()) {
        await copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  } catch (error) {
    throw error;
  }
}

// Get directory size in bytes
function getDirectorySize(dirPath) {
  let totalSize = 0;

  function calculateSize(itemPath) {
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      const files = fs.readdirSync(itemPath);
      files.forEach((file) => {
        calculateSize(path.join(itemPath, file));
      });
    } else {
      totalSize += stats.size;
    }
  }

  try {
    calculateSize(dirPath);
  } catch (error) {
    // Error calculating directory size
  }

  return totalSize;
}

// Format bytes to human readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// List available backups
function listBackups() {
  try {
    const backupDir = CONFIG.BACKUP_BASE_PATH;
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const backups = fs
      .readdirSync(backupDir)
      .filter((item) => {
        const itemPath = path.join(backupDir, item);
        return fs.statSync(itemPath).isDirectory() && item !== "uploads";
      })
      .map((backupId) => {
        const backupPath = path.join(backupDir, backupId);
        const stats = fs.statSync(backupPath);
        const size = getDirectorySize(backupPath);

        // Check if this is an uploaded backup with metadata
        const metadataPath = path.join(backupPath, "metadata.json");
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
            return {
              id: metadata.id,
              type: metadata.type,
              timestamp: new Date(metadata.timestamp),
              size: metadata.size,
              sizeFormatted: metadata.sizeFormatted,
              path: metadata.path,
              filePath: metadata.filePath,
              originalName: metadata.originalName,
              backupName: metadata.backupName,
              description: metadata.description,
              uploaded: metadata.uploaded,
            };
          } catch (error) {
            console.error(
              `Error reading metadata for backup ${backupId}:`,
              error
            );
          }
        }

        // Parse backup info from directory name for regular backups
        let type = "unknown";
        let timestamp = new Date();

        // Check for new wmm_backup format: wmm_backup(yyyy-mm-dd_HH-MM) or wmm_backup(yyyy-mm-dd_HH-MM)_database
        if (backupId.startsWith("wmm_backup(") && backupId.includes(")")) {
          const match = backupId.match(
            /wmm_backup\((\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})\)(?:_(.+))?/
          );
          if (match) {
            const dateStr = match[1]; // yyyy-mm-dd
            const timeStr = match[2]; // HH-MM
            const database = match[3]; // optional database name

            // Parse yyyy-mm-dd_HH-MM
            const timeForDate = timeStr.replace("-", ":");
            timestamp = new Date(`${dateStr}T${timeForDate}:00`);

            if (database) {
              type = "database";
            } else {
              type = "full";
            }
          }
        } else {
          // Fallback to old format parsing
          const parts = backupId.split("_");
          type = parts[1] || "unknown";

          // Try to parse timestamp from old format (database_type_YYYY-MM-DD_HH-MM)
          if (
            parts.length >= 4 &&
            parts[2].match(/^\d{4}-\d{2}-\d{2}$/) &&
            parts[3].match(/^\d{2}-\d{2}$/)
          ) {
            // Old format: database_type_YYYY-MM-DD_HH-MM
            const dateStr = parts[2];
            const timeStr = parts[3].replace("-", ":");
            timestamp = new Date(`${dateStr}T${timeStr}:00`);
          } else {
            // Fallback to timestamp format
            timestamp = new Date(parseInt(parts[parts.length - 1]) || 0);
          }
        }

        return {
          id: backupId,
          type,
          timestamp,
          size,
          sizeFormatted: formatBytes(size),
          path: backupPath,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    return backups;
  } catch (error) {
    return [];
  }
}

// Clean up old backups
function cleanupOldBackups() {
  try {
    const backups = listBackups();
    const backupsToDelete = backups.slice(CONFIG.MAX_BACKUPS);

    if (backupsToDelete.length === 0) {
      return { deleted: 0 };
    }

    let deletedCount = 0;
    backupsToDelete.forEach((backup) => {
      try {
        fs.rmSync(backup.path, { recursive: true, force: true });
        deletedCount++;
      } catch (error) {
        // Failed to delete backup
      }
    });

    log(`Cleanup completed`, {
      deleted: deletedCount,
      remaining: backups.length - deletedCount,
    });
    return { deleted: deletedCount };
  } catch (error) {
    return { deleted: 0, error: error.message };
  }
}

// Create backup archive for download (ZIP format for Windows compatibility)
async function createBackupArchive(backupId) {
  try {
    const backups = listBackups();
    const backup = backups.find((b) => b.id === backupId);

    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    const archivePath = path.join(CONFIG.TEMP_BACKUP_PATH, `${backupId}.zip`);

    // Try using zip command first, fallback to Node.js archiver
    try {
      // Create ZIP archive using zip command
      const command = `cd "${CONFIG.BACKUP_BASE_PATH}" && zip -r "${archivePath}" "${backupId}"`;
      await execAsync(command);

      const archiveSize = fs.statSync(archivePath).size;

      // Archive created using zip command

      return {
        path: archivePath,
        size: archiveSize,
        sizeFormatted: formatBytes(archiveSize),
      };
    } catch (zipError) {
      // Fallback to Node.js archiver
      return await createBackupArchiveWithArchiver(
        backupId,
        backup,
        archivePath
      );
    }
  } catch (error) {
    throw error;
  }
}

// Fallback method using Node.js archiver
async function createBackupArchiveWithArchiver(backupId, backup, archivePath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(archivePath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    output.on("close", () => {
      const archiveSize = fs.statSync(archivePath).size;

      // Archive created using Node.js archiver

      resolve({
        path: archivePath,
        size: archiveSize,
        sizeFormatted: formatBytes(archiveSize),
      });
    });

    archive.on("error", (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add the backup directory to the archive
    archive.directory(backup.path, backupId);

    // Finalize the archive
    archive.finalize();
  });
}

// Autosave functionality
let autosaveJob = null;

function startAutosave() {
  if (!CONFIG.AUTOSAVE_ENABLED) {
    return;
  }

  if (autosaveJob) {
    return;
  }

  autosaveJob = cron.schedule(
    CONFIG.AUTOSAVE_SCHEDULE,
    async () => {
      try {
        // Emit backup start event to all connected clients
        emitBackupEvent("backup-started", {
          type: "autosave",
          message: "Automatic backup started",
          timestamp: new Date().toISOString(),
        });

        const result = await createFullBackup("autosave");
        cleanupOldBackups();

        // Emit backup completion event to all connected clients
        emitBackupEvent("backup-completed", {
          type: "autosave",
          message: "Automatic backup completed successfully",
          timestamp: new Date().toISOString(),
          backupId: result.id,
          size: result.totalSize,
          sizeFormatted: formatBytes(result.totalSize),
          successCount: result.successCount,
          totalDatabases: CONFIG.MONGODB_DATABASES.length,
        });
      } catch (error) {
        log(`Scheduled backup failed`, { error: error.message });

        // Emit backup error event to all connected clients
        emitBackupEvent("backup-error", {
          type: "autosave",
          message: "Automatic backup failed",
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Manila",
    }
  );
}

function stopAutosave() {
  if (autosaveJob) {
    autosaveJob.stop();
    autosaveJob = null;
  }
}

// Initialize backup service
function initializeBackupService() {
  updateBackupPath();
  ensureDirectories();
  startAutosave();
  log(`Database backup service initialized`, {
    backupPath: CONFIG.BACKUP_BASE_PATH,
    databases: CONFIG.MONGODB_DATABASES,
    autosaveEnabled: CONFIG.AUTOSAVE_ENABLED,
    autosaveSchedule: CONFIG.AUTOSAVE_SCHEDULE,
    maxBackups: CONFIG.MAX_BACKUPS,
  });
}

// Execute mongorestore command
async function executeMongorestore(database, backupPath, options = {}) {
  const {
    drop = false,
    excludeCollections = [],
    includeCollections = [],
  } = options;

  // Get MongoDB URI options (primary and fallback)
  const uriOptions = fixMongoDBURI(CONFIG.MONGODB_URI);

  // Try primary URI first, then fallback if it fails
  const urisToTry = [uriOptions.primary, uriOptions.fallback];

  for (let i = 0; i < urisToTry.length; i++) {
    const uri = urisToTry[i];
    const isFallback = i > 0;

    // Test connection first (skip for fallback if primary test passed)
    if (i === 0 || (i === 1 && urisToTry[0] !== urisToTry[1])) {
      const connectionTest = await testMongoDBConnection(uri, database);
      if (!connectionTest.success) {
        if (i === urisToTry.length - 1) {
          throw new Error(
            `MongoDB connection failed for all URIs. Last error: ${
              connectionTest.error || "Connection test failed"
            }`
          );
        }
        continue;
      }
    }

    let command = `mongorestore --uri="${uri}/${database}" "${backupPath}" --quiet`;

    // Add gzip option if backup files are compressed
    if (CONFIG.COMPRESSION) {
      command += " --gzip";
    }

    // Add drop option if specified
    if (drop) {
      command += " --drop";
    }

    // Add collection filters
    if (excludeCollections.length > 0) {
      excludeCollections.forEach((collection) => {
        command += ` --excludeCollection="${collection}"`;
      });
    }

    if (includeCollections.length > 0) {
      includeCollections.forEach((collection) => {
        command += ` --collection="${collection}"`;
      });
    }

    // Execute mongorestore command
    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 50, // 50MB buffer
        timeout: 300000, // 5 minutes timeout
      });
      return {
        success: true,
        stdout,
        stderr,
        uri: uri.replace(/\/\/.*@/, "//***@"),
      };
    } catch (error) {
      // If this is the last attempt, throw the error
      if (i === urisToTry.length - 1) {
        throw new Error(
          `Mongorestore failed for ${database} after ${urisToTry.length} attempts. Last error: ${error.message}`
        );
      }
    }
  }
}

// Extract ZIP file to directory
async function extractZipFile(zipPath, extractPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          const dirPath = path.join(extractPath, entry.fileName);
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          zipfile.readEntry();
        } else {
          // File entry
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }

            const filePath = path.join(extractPath, entry.fileName);
            const dirPath = path.dirname(filePath);

            // Ensure directory exists
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }

            const writeStream = createWriteStream(filePath);
            readStream.pipe(writeStream);

            writeStream.on("close", () => {
              zipfile.readEntry();
            });

            writeStream.on("error", (err) => {
              reject(err);
            });
          });
        }
      });

      zipfile.on("end", () => {
        resolve();
      });

      zipfile.on("error", (err) => {
        reject(err);
      });
    });
  });
}

// Restore database from backup
async function restoreDatabaseFromBackup(backupId, database, options = {}) {
  const {
    drop = false,
    excludeCollections = [],
    includeCollections = [],
  } = options;

  try {
    // Find the backup
    const backups = listBackups();
    const backup = backups.find((b) => b.id === backupId);

    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    let actualBackupPath = backup.path;
    let isExtracted = false;

    // Check if this is an uploaded backup (ZIP file)
    if (backup.uploaded && backup.filePath) {
      const zipPath = backup.filePath;
      if (fs.existsSync(zipPath)) {
        // Create extraction directory
        const extractPath = path.join(backup.path, "extracted");
        if (!fs.existsSync(extractPath)) {
          fs.mkdirSync(extractPath, { recursive: true });
        }

        // Extract the ZIP file
        log(`Extracting uploaded backup ZIP file: ${zipPath}`);
        await extractZipFile(zipPath, extractPath);
        actualBackupPath = extractPath;
        isExtracted = true;
        log(`ZIP file extracted to: ${extractPath}`);
      } else {
        throw new Error(`Uploaded backup file not found: ${zipPath}`);
      }
    }

    // For uploaded backups, check if there's a nested directory structure
    let basePath = actualBackupPath;
    if (isExtracted) {
      // Look for a subdirectory that might contain the actual backup
      const extractedContents = fs.readdirSync(actualBackupPath);
      const backupSubdir = extractedContents.find((item) => {
        const itemPath = path.join(actualBackupPath, item);
        return (
          fs.statSync(itemPath).isDirectory() &&
          (item.startsWith("full_") ||
            item.startsWith("database_") ||
            item.includes("backup"))
        );
      });

      if (backupSubdir) {
        basePath = path.join(actualBackupPath, backupSubdir);
        log(
          `Found nested backup directory: ${backupSubdir}, using base path: ${basePath}`
        );
      }
    }

    // Check if backup contains the specified database
    const databasePath = path.join(basePath, database);
    if (!fs.existsSync(databasePath)) {
      throw new Error(`Database ${database} not found in backup ${backupId}`);
    }

    // Emit restore start event
    emitBackupEvent("restore-started", {
      type: "manual",
      message: `Restore started for ${database} from backup ${backupId}`,
      database: database,
      backupId: backupId,
      timestamp: new Date().toISOString(),
    });

    // Execute mongorestore
    const result = await executeMongorestore(database, databasePath, {
      drop,
      excludeCollections,
      includeCollections,
    });

    // Clean up extracted files if this was an uploaded backup
    if (isExtracted) {
      try {
        const extractPath = path.join(backup.path, "extracted");
        if (fs.existsSync(extractPath)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
          log(`Cleaned up extracted files from: ${extractPath}`);
        }
      } catch (cleanupError) {
        log(
          `Warning: Failed to clean up extracted files: ${cleanupError.message}`
        );
      }
    }

    log(`Database restored successfully`, {
      database,
      backupId,
      drop,
      result: result.success,
    });

    // Emit restore completion event
    emitBackupEvent("restore-completed", {
      type: "manual",
      message: `Restore completed for ${database} from backup ${backupId}`,
      database: database,
      backupId: backupId,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      database,
      backupId,
      result,
    };
  } catch (error) {
    // Clean up extracted files if this was an uploaded backup (even on error)
    if (isExtracted) {
      try {
        const extractPath = path.join(backup.path, "extracted");
        if (fs.existsSync(extractPath)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
          log(`Cleaned up extracted files after error from: ${extractPath}`);
        }
      } catch (cleanupError) {
        log(
          `Warning: Failed to clean up extracted files after error: ${cleanupError.message}`
        );
      }
    }

    log(`Database restore failed`, {
      database,
      backupId,
      error: error.message,
    });

    // Emit restore error event
    emitBackupEvent("restore-error", {
      type: "manual",
      message: `Restore failed for ${database} from backup ${backupId}`,
      database: database,
      backupId: backupId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

// Restore all databases from a full backup
async function restoreFullBackup(backupId, options = {}) {
  const {
    drop = false,
    excludeCollections = [],
    includeCollections = [],
  } = options;

  try {
    // Find the backup
    const backups = listBackups();
    const backup = backups.find((b) => b.id === backupId);

    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    let actualBackupPath = backup.path;
    let isExtracted = false;

    // Check if this is an uploaded backup (ZIP file)
    if (backup.uploaded && backup.filePath) {
      const zipPath = backup.filePath;
      if (fs.existsSync(zipPath)) {
        // Create extraction directory
        const extractPath = path.join(backup.path, "extracted");
        if (!fs.existsSync(extractPath)) {
          fs.mkdirSync(extractPath, { recursive: true });
        }

        // Extract the ZIP file
        log(`Extracting uploaded backup ZIP file: ${zipPath}`);
        await extractZipFile(zipPath, extractPath);
        actualBackupPath = extractPath;
        isExtracted = true;
        log(`ZIP file extracted to: ${extractPath}`);
      } else {
        throw new Error(`Uploaded backup file not found: ${zipPath}`);
      }
    }

    // For uploaded backups, check if there's a nested directory structure
    let basePath = actualBackupPath;
    if (isExtracted) {
      // Look for a subdirectory that might contain the actual backup
      const extractedContents = fs.readdirSync(actualBackupPath);
      const backupSubdir = extractedContents.find((item) => {
        const itemPath = path.join(actualBackupPath, item);
        return (
          fs.statSync(itemPath).isDirectory() &&
          (item.startsWith("full_") ||
            item.startsWith("database_") ||
            item.includes("backup"))
        );
      });

      if (backupSubdir) {
        basePath = path.join(actualBackupPath, backupSubdir);
        log(
          `Found nested backup directory: ${backupSubdir}, using base path: ${basePath}`
        );
      }
    }

    // Check if this is a full backup by looking for metadata file
    const metadataPath = path.join(basePath, "backup_metadata.json");
    let metadata = null;
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      } catch (error) {
        // Metadata file exists but couldn't be parsed
      }
    }

    // Emit restore start event
    emitBackupEvent("restore-started", {
      type: "manual",
      message: `Full restore started from backup ${backupId}`,
      backupId: backupId,
      timestamp: new Date().toISOString(),
    });

    const results = [];
    let successCount = 0;

    // Get list of databases to restore
    const databasesToRestore = metadata
      ? metadata.databases
      : CONFIG.MONGODB_DATABASES;

    for (const database of databasesToRestore) {
      try {
        const databasePath = path.join(basePath, database);
        if (!fs.existsSync(databasePath)) {
          results.push({
            database,
            success: false,
            error: `Database ${database} not found in backup`,
          });
          continue;
        }

        const result = await executeMongorestore(database, databasePath, {
          drop,
          excludeCollections,
          includeCollections,
        });

        results.push({
          database,
          success: true,
          result,
        });
        successCount++;
      } catch (error) {
        results.push({
          database,
          success: false,
          error: error.message,
        });
      }
    }

    log(`Full backup restore completed`, {
      backupId,
      successCount,
      totalDatabases: databasesToRestore.length,
      results,
    });

    // Clean up extracted files if this was an uploaded backup
    if (isExtracted) {
      try {
        const extractPath = path.join(backup.path, "extracted");
        if (fs.existsSync(extractPath)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
          log(`Cleaned up extracted files from: ${extractPath}`);
        }
      } catch (cleanupError) {
        log(
          `Warning: Failed to clean up extracted files: ${cleanupError.message}`
        );
      }
    }

    // Emit restore completion event
    emitBackupEvent("restore-completed", {
      type: "manual",
      message: `Full restore completed from backup ${backupId}`,
      backupId: backupId,
      successCount: successCount,
      totalDatabases: databasesToRestore.length,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      backupId,
      results,
      successCount,
      totalDatabases: databasesToRestore.length,
    };
  } catch (error) {
    // Clean up extracted files if this was an uploaded backup (even on error)
    if (isExtracted) {
      try {
        const extractPath = path.join(backup.path, "extracted");
        if (fs.existsSync(extractPath)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
          log(`Cleaned up extracted files after error from: ${extractPath}`);
        }
      } catch (cleanupError) {
        log(
          `Warning: Failed to clean up extracted files after error: ${cleanupError.message}`
        );
      }
    }

    log(`Full backup restore failed`, {
      backupId,
      error: error.message,
    });

    // Emit restore error event
    emitBackupEvent("restore-error", {
      type: "manual",
      message: `Full restore failed from backup ${backupId}`,
      backupId: backupId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

// Check if database is empty
async function isDatabaseEmpty(database) {
  try {
    const uriOptions = fixMongoDBURI(CONFIG.MONGODB_URI);
    const uri = uriOptions.primary;

    const command = `mongosh --quiet --eval "db.stats().collections" "${uri}/${database}"`;
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

    // If collections count is 0, database is empty
    const collectionsCount = parseInt(stdout.trim());
    return collectionsCount === 0;
  } catch (error) {
    // If we can't connect or check, assume it's not empty for safety
    return false;
  }
}

// Get database collection count and last modified date
async function getDatabaseInfo(database) {
  try {
    const uriOptions = fixMongoDBURI(CONFIG.MONGODB_URI);
    const uri = uriOptions.primary;

    // Get collection count and list of collections
    const command = `mongosh --quiet --eval "JSON.stringify({collections: db.stats().collections, collectionNames: db.getCollectionNames()})" "${uri}/${database}"`;
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

    try {
      const result = JSON.parse(stdout.trim());
      // Ensure collections is a number, not an object
      const collections =
        typeof result.collections === "number" ? result.collections : 0;
      const collectionNames = result.collectionNames || [];

      // If there are collections, get the last modified date from the first collection
      let lastModified = null;
      if (collectionNames.length > 0) {
        try {
          const lastModCommand = `mongosh --quiet --eval "try { const stats = db.${collectionNames[0]}.stats(); JSON.stringify({lastMod: stats.lastMod}) } catch(e) { JSON.stringify({error: e.message}) }" "${uri}/${database}"`;
          const { stdout: lastModStdout } = await execAsync(lastModCommand, {
            timeout: 5000,
          });
          const lastModResult = JSON.parse(lastModStdout.trim());
          if (
            lastModResult &&
            lastModResult.lastMod &&
            lastModResult.lastMod.$date
          ) {
            lastModified = new Date(lastModResult.lastMod.$date);
          }
        } catch (lastModError) {
          // If we can't get last modified, continue without it
          console.warn(
            `Could not get last modified date for ${database}:`,
            lastModError.message
          );
        }
      }

      return {
        success: true,
        collections,
        lastModified,
      };
    } catch (parseError) {
      return {
        success: false,
        error: "Failed to parse database info",
        collections: 0,
        lastModified: null,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      collections: 0,
      lastModified: null,
    };
  }
}

// Compare backup age with database last modified date
function compareBackupAgeWithDatabase(backupTimestamp, databaseLastModified) {
  if (!databaseLastModified) {
    return {
      comparison: "unknown",
      message: "Cannot determine database last modified date",
      isBackupOlder: false,
    };
  }

  const backupAge = new Date() - backupTimestamp;
  const dbAge = new Date() - databaseLastModified;
  const isBackupOlder = backupTimestamp < databaseLastModified;

  const backupAgeHours = Math.floor(backupAge / (1000 * 60 * 60));
  const dbAgeHours = Math.floor(dbAge / (1000 * 60 * 60));

  let comparison = "unknown";
  let message = "";

  if (isBackupOlder) {
    comparison = "backup_older";
    message = `Backup is ${backupAgeHours}h old, but database was modified ${dbAgeHours}h ago. Restoring will overwrite newer data.`;
  } else {
    comparison = "backup_newer";
    message = `Backup is ${backupAgeHours}h old, database was modified ${dbAgeHours}h ago. Backup appears to be newer.`;
  }

  return {
    comparison,
    message,
    isBackupOlder,
    backupAgeHours,
    dbAgeHours,
  };
}

// Comprehensive restore validation with safety checks
async function validateRestoreWithSafety(
  backupId,
  database = null,
  options = {}
) {
  const { skipConfirmation = false, force = false } = options;

  try {
    // First, do basic backup validation
    const basicValidation = validateBackupForRestore(backupId, database);
    if (!basicValidation.valid) {
      return {
        ...basicValidation,
        safetyChecks: null,
        requiresConfirmation: false,
      };
    }

    const backup = basicValidation.backup;
    const databasesToCheck = database ? [database] : CONFIG.MONGODB_DATABASES;

    const safetyChecks = {
      databases: {},
      overallStatus: "safe",
      warnings: [],
      requiresConfirmation: false,
    };

    // Check each database
    for (const db of databasesToCheck) {
      const dbInfo = await getDatabaseInfo(db);
      const isEmpty = await isDatabaseEmpty(db);

      const dbCheck = {
        database: db,
        isEmpty,
        collections: dbInfo.collections,
        lastModified: dbInfo.lastModified,
        status: "safe",
        warnings: [],
      };

      if (!dbInfo.success) {
        dbCheck.status = "error";
        dbCheck.warnings.push(`Cannot check database state: ${dbInfo.error}`);
        safetyChecks.overallStatus = "error";
      } else if (!isEmpty) {
        // Database is not empty, check if backup is older
        const ageComparison = compareBackupAgeWithDatabase(
          backup.timestamp,
          dbInfo.lastModified
        );

        if (ageComparison.isBackupOlder) {
          dbCheck.status = "warning";
          dbCheck.warnings.push(ageComparison.message);
          safetyChecks.overallStatus = "warning";
          safetyChecks.requiresConfirmation = true;
        } else {
          dbCheck.warnings.push(ageComparison.message);
        }
      }

      safetyChecks.databases[db] = dbCheck;
    }

    // Add overall warnings
    if (safetyChecks.overallStatus === "warning") {
      safetyChecks.warnings.push(
        "Some databases contain data that may be overwritten by an older backup"
      );
    }

    return {
      valid: true,
      backup,
      safetyChecks,
      requiresConfirmation:
        safetyChecks.requiresConfirmation && !skipConfirmation && !force,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Safety validation failed: ${error.message}`,
      safetyChecks: null,
      requiresConfirmation: false,
    };
  }
}

// Validate backup before restore (legacy function for backward compatibility)
function validateBackupForRestore(backupId, database = null) {
  const backups = listBackups();
  const backup = backups.find((b) => b.id === backupId);

  if (!backup) {
    return {
      valid: false,
      error: `Backup ${backupId} not found`,
    };
  }

  // For uploaded backups, we need to check if the ZIP file exists
  if (backup.uploaded && backup.filePath) {
    if (!fs.existsSync(backup.filePath)) {
      return {
        valid: false,
        error: `Uploaded backup file not found: ${backup.filePath}`,
      };
    }

    // For uploaded backups, we can't easily validate the contents without extracting
    // So we'll assume it's valid if the file exists and let the restore function handle extraction
    return {
      valid: true,
      backup,
    };
  }

  if (database) {
    // Check if specific database exists in backup
    const databasePath = path.join(backup.path, database);
    if (!fs.existsSync(databasePath)) {
      return {
        valid: false,
        error: `Database ${database} not found in backup ${backupId}`,
      };
    }
  } else {
    // Check if this is a full backup
    const metadataPath = path.join(backup.path, "backup_metadata.json");
    if (!fs.existsSync(metadataPath)) {
      // Check if backup contains any of the configured databases
      const hasAnyDatabase = CONFIG.MONGODB_DATABASES.some((db) => {
        const dbPath = path.join(backup.path, db);
        return fs.existsSync(dbPath);
      });

      if (!hasAnyDatabase) {
        return {
          valid: false,
          error: `No valid databases found in backup ${backupId}`,
        };
      }
    }
  }

  return {
    valid: true,
    backup,
  };
}

// Export functions
export {
  createDatabaseBackup,
  createFullBackup,
  listBackups,
  cleanupOldBackups,
  createBackupArchive,
  restoreDatabaseFromBackup,
  restoreFullBackup,
  validateBackupForRestore,
  validateRestoreWithSafety,
  isDatabaseEmpty,
  getDatabaseInfo,
  compareBackupAgeWithDatabase,
  startAutosave,
  stopAutosave,
  initializeBackupService,
  CONFIG,
  backupEventEmitter,
};

// Initialize if this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeBackupService();

  // Run a test backup
  createFullBackup("test")
    .then((result) => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test backup failed:", error.message);
      process.exit(1);
    });
}

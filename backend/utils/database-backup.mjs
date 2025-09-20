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
    console.log(`[Backup Event] ${eventName}:`, data);

    // Add a small delay to ensure WebSocket connection is ready
    if (eventName === "backup-started") {
      setTimeout(() => {
        backupEventEmitter.emit(eventName, data);
        console.log(`[Backup Event] ${eventName} (retry):`, data);
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
  const backupId = `${database}_${type}_${dateStr}_${timeStr}`;

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
    console.log(
      `[Backup] Calculated size for ${database}: ${formatBytes(
        backupSize
      )} (${backupSize} bytes)`
    );

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
  const backupId = `full_${type}_${dateStr}_${timeStr}`;

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

    console.log(
      `[Backup] Full backup total size: ${formatBytes(
        totalSize
      )} (${totalSize} bytes)`
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
        return fs.statSync(itemPath).isDirectory();
      })
      .map((backupId) => {
        const backupPath = path.join(backupDir, backupId);
        const stats = fs.statSync(backupPath);
        const size = getDirectorySize(backupPath);

        // Parse backup info from directory name
        const parts = backupId.split("_");
        const type = parts[1] || "unknown";

        // Try to parse timestamp from new format (database_type_YYYY-MM-DD_HH-MM)
        let timestamp;
        if (
          parts.length >= 4 &&
          parts[2].match(/^\d{4}-\d{2}-\d{2}$/) &&
          parts[3].match(/^\d{2}-\d{2}$/)
        ) {
          // New format: database_type_YYYY-MM-DD_HH-MM
          const dateStr = parts[2];
          const timeStr = parts[3].replace("-", ":");
          timestamp = new Date(`${dateStr}T${timeStr}:00`);
        } else {
          // Fallback to old format (timestamp)
          timestamp = new Date(parseInt(parts[parts.length - 1]) || 0);
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

// Export functions
export {
  createDatabaseBackup,
  createFullBackup,
  listBackups,
  cleanupOldBackups,
  createBackupArchive,
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
      console.log("Test backup completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test backup failed:", error.message);
      process.exit(1);
    });
}

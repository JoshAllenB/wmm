/**
 * Backup Management Utility
 *
 * Command-line utility for managing database backups:
 * - Create backups manually
 * - List and manage existing backups
 * - Clean up old backups
 * - Monitor backup status
 */

import {
  createFullBackup,
  createDatabaseBackup,
  listBackups,
  cleanupOldBackups,
  createBackupArchive,
  initializeBackupService,
  CONFIG,
  backupEventEmitter,
} from "./database-backup.mjs";
import { program } from "commander";
import fs from "fs";
import path from "path";
import { io } from "socket.io-client";

// Initialize commander
program
  .name("backup-manager")
  .description("Database backup management utility")
  .version("1.0.0");

// Create backup command
program
  .command("create")
  .description("Create a new backup")
  .option(
    "-d, --database <database>",
    "Specific database to backup (wmm_client or wmm_user)"
  )
  .option("-t, --type <type>", "Backup type (manual, autosave, test)", "manual")
  .option("--no-compression", "Disable compression")
  .action(async (options) => {
    try {
      let result;
      if (options.database) {
        if (!CONFIG.MONGODB_DATABASES.includes(options.database)) {
          console.error(
            `Error: Database '${
              options.database
            }' is not in the configured list: ${CONFIG.MONGODB_DATABASES.join(
              ", "
            )}`
          );
          process.exit(1);
        }
        result = await createDatabaseBackup(options.database, options.type, {
          compression: options.compression,
        });
        console.log(
          `Backup created: ${result.id} (${formatBytes(
            result.size || result.totalSize
          )})`
        );
      } else {
        result = await createFullBackup(options.type, {
          compression: options.compression,
        });
        console.log(
          `Backup created: ${result.id} (${formatBytes(
            result.size || result.totalSize
          )})`
        );
      }
    } catch (error) {
      console.error("Backup failed:", error.message);
      process.exit(1);
    }
  });

// List backups command
program
  .command("list")
  .description("List all available backups")
  .option("-l, --limit <number>", "Limit number of backups to show", "10")
  .option("--type <type>", "Filter by backup type")
  .action(async (options) => {
    try {
      const backups = listBackups();
      let filteredBackups = backups;

      if (options.type) {
        filteredBackups = backups.filter(
          (backup) => backup.type === options.type
        );
      }

      const limit = parseInt(options.limit);
      const displayBackups = filteredBackups.slice(0, limit);

      console.log(
        `Backups: ${displayBackups.length}${
          filteredBackups.length !== backups.length
            ? ` of ${backups.length}`
            : ""
        }`
      );

      if (displayBackups.length === 0) {
        console.log("No backups found");
        return;
      }

      displayBackups.forEach((backup, index) => {
        const age = getAge(backup.timestamp);
        console.log(
          `${index + 1}. ${backup.id} (${backup.type}, ${
            backup.sizeFormatted
          }, ${age})`
        );
      });

      if (filteredBackups.length > limit) {
        console.log(`... and ${filteredBackups.length - limit} more`);
      }
    } catch (error) {
      console.error("Failed to list backups:", error.message);
      process.exit(1);
    }
  });

// Cleanup command
program
  .command("cleanup")
  .description("Clean up old backups (keep only the most recent ones)")
  .option("--dry-run", "Show what would be deleted without actually deleting")
  .action(async (options) => {
    try {
      if (options.dryRun) {
        const backups = listBackups();
        const backupsToDelete = backups.slice(CONFIG.MAX_BACKUPS);

        console.log(
          `Dry run - ${backupsToDelete.length} backups would be deleted`
        );

        if (backupsToDelete.length === 0) {
          console.log("No backups would be deleted");
          return;
        }

        backupsToDelete.forEach((backup, index) => {
          const age = getAge(backup.timestamp);
          console.log(`${index + 1}. ${backup.id} (${backup.type}, ${age})`);
        });
      } else {
        const result = cleanupOldBackups();
        console.log(`Cleanup: ${result.deleted} backups deleted`);
      }
    } catch (error) {
      console.error("Cleanup failed:", error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command("status")
  .description("Show backup service status and statistics")
  .action(async () => {
    try {
      const backups = listBackups();
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      const byType = backups.reduce((acc, backup) => {
        acc[backup.type] = (acc[backup.type] || 0) + 1;
        return acc;
      }, {});

      console.log(
        `Total backups: ${backups.length} (${formatBytes(totalSize)})`
      );

      if (Object.keys(byType).length > 0) {
        Object.entries(byType).forEach(([type, count]) => {
          console.log(`${type}: ${count}`);
        });
      }
    } catch (error) {
      console.error("Status check failed:", error.message);
      process.exit(1);
    }
  });

// Download command
program
  .command("download <backupId>")
  .description("Create a downloadable archive of a backup")
  .option("-o, --output <path>", "Output path for the archive")
  .action(async (backupId, options) => {
    try {
      const archive = await createBackupArchive(backupId);
      const outputPath =
        options.output || path.join(process.cwd(), `${backupId}.tar.gz`);

      // Copy archive to output path if different
      if (archive.path !== outputPath) {
        fs.copyFileSync(archive.path, outputPath);
        fs.unlinkSync(archive.path); // Clean up temp file
      }

      console.log(`Archive created: ${outputPath}`);
    } catch (error) {
      console.error("Archive creation failed:", error.message);
      process.exit(1);
    }
  });

// Delete command
program
  .command("delete <backupId>")
  .description("Delete a specific backup")
  .option("--force", "Skip confirmation prompt")
  .action(async (backupId, options) => {
    try {
      const backups = listBackups();
      const backup = backups.find((b) => b.id === backupId);

      if (!backup) {
        console.error(`Backup not found: ${backupId}`);
        process.exit(1);
      }

      if (!options.force) {
        process.exit(0);
      }

      fs.rmSync(backup.path, { recursive: true, force: true });
      console.log(`Backup deleted: ${backupId}`);
    } catch (error) {
      console.error("Delete failed:", error.message);
      process.exit(1);
    }
  });

// Helper functions
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getAge(timestamp) {
  const now = new Date();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

// Connect to main server's WebSocket and forward backup events
function setupWebSocketForwarding() {
  const serverUrl = `http://${process.env.IP_ADDRESS || "localhost"}:3001`;

  try {
    const socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      timeout: 10000, // Increased timeout
      query: {
        isBackupManager: "true",
      },
    });

    let isConnected = false;

    socket.on("connect", () => {
      console.log(`[Backup Manager] Connected to main server at ${serverUrl}`);
      isConnected = true;

      // Forward backup events to the main server
      backupEventEmitter.on("backup-started", (data) => {
        if (isConnected) {
          console.log("[Backup Manager] Forwarding backup-started event");
          socket.emit("backup-started", data);
        }
      });

      backupEventEmitter.on("backup-completed", (data) => {
        if (isConnected) {
          console.log("[Backup Manager] Forwarding backup-completed event");
          socket.emit("backup-completed", data);
        }
      });

      backupEventEmitter.on("backup-error", (data) => {
        if (isConnected) {
          console.log("[Backup Manager] Forwarding backup-error event");
          socket.emit("backup-error", data);
        }
      });
    });

    socket.on("disconnect", () => {
      console.log("[Backup Manager] Disconnected from main server");
      isConnected = false;
    });

    socket.on("connect_error", (error) => {
      console.log(
        "[Backup Manager] Failed to connect to main server:",
        error.message
      );
      console.log("[Backup Manager] Backup events will only be logged locally");
      isConnected = false;
    });

    // Keep connection alive with ping
    const keepAliveInterval = setInterval(() => {
      if (isConnected) {
        socket.emit("ping");
      }
    }, 5000);

    // Clean up interval when socket disconnects
    socket.on("disconnect", () => {
      clearInterval(keepAliveInterval);
    });

    return socket;
  } catch (error) {
    console.log(
      "[Backup Manager] Failed to setup WebSocket connection:",
      error.message
    );
    console.log("[Backup Manager] Backup events will only be logged locally");
    return null;
  }
}

// Global socket reference
let globalSocket = null;

// Initialize and run
if (import.meta.url === `file://${process.argv[1]}`) {
  // Set up WebSocket forwarding to main server
  globalSocket = setupWebSocketForwarding();

  // Initialize backup service
  initializeBackupService();

  // Wait for connection before parsing commands
  if (globalSocket) {
    globalSocket.on("connect", () => {
      console.log("[Backup Manager] Ready to process commands");
    });
  }

  // Parse command line arguments
  program.parse();
}

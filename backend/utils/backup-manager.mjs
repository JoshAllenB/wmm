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
  restoreDatabaseFromBackup,
  restoreFullBackup,
  validateBackupForRestore,
  validateRestoreWithSafety,
  initializeBackupService,
  CONFIG,
  backupEventEmitter,
} from "./database-backup.mjs";
import { program } from "commander";
import fs from "fs";
import path from "path";
import { io } from "socket.io-client";
import readline from "readline";

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

// Restore command
program
  .command("restore <backupId>")
  .description("Restore database(s) from a backup")
  .option(
    "-d, --database <database>",
    "Specific database to restore (wmm_client or wmm_user)"
  )
  .option("--drop", "Drop existing collections before restore")
  .option(
    "--exclude-collections <collections>",
    "Comma-separated list of collections to exclude"
  )
  .option(
    "--include-collections <collections>",
    "Comma-separated list of collections to include"
  )
  .option("--force", "Skip safety validation and confirmation prompts")
  .option(
    "--skip-confirmation",
    "Skip confirmation prompts but still show safety warnings"
  )
  .action(async (backupId, options) => {
    try {
      // Perform comprehensive safety validation
      const validation = await validateRestoreWithSafety(
        backupId,
        options.database,
        {
          skipConfirmation: options.skipConfirmation,
          force: options.force,
        }
      );

      if (!validation.valid) {
        console.error(`❌ Validation failed: ${validation.error}`);
        process.exit(1);
      }

      // Display safety warnings and get confirmation if needed
      if (!options.force) {
        const confirmed = await displaySafetyWarningsAndConfirm(validation);
        if (!confirmed) {
          process.exit(0);
        }
      }

      // Parse collection filters
      const excludeCollections = options.excludeCollections
        ? options.excludeCollections.split(",").map((c) => c.trim())
        : [];
      const includeCollections = options.includeCollections
        ? options.includeCollections.split(",").map((c) => c.trim())
        : [];

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
        result = await restoreDatabaseFromBackup(backupId, options.database, {
          drop: options.drop,
          excludeCollections,
          includeCollections,
        });
        console.log(
          `✅ Database ${options.database} restored from backup ${backupId}`
        );
      } else {
        result = await restoreFullBackup(backupId, {
          drop: options.drop,
          excludeCollections,
          includeCollections,
        });
        console.log(
          `✅ Full backup restored from ${backupId} (${result.successCount}/${result.totalDatabases} databases)`
        );
      }
    } catch (error) {
      console.error("❌ Restore failed:", error.message);
      process.exit(1);
    }
  });

// Validate command
program
  .command("validate <backupId>")
  .description("Validate a backup for restore operations")
  .option("-d, --database <database>", "Specific database to validate")
  .action(async (backupId, options) => {
    try {
      const validation = validateBackupForRestore(backupId, options.database);

      if (validation.valid) {
        console.log(`✓ Backup ${backupId} is valid for restore`);
        if (options.database) {
          console.log(`  Database: ${options.database}`);
        } else {
          console.log(`  Type: Full backup`);
        }
      } else {
        console.error(`✗ Backup validation failed: ${validation.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error("Validation failed:", error.message);
      process.exit(1);
    }
  });

// Safety check command
program
  .command("safety-check <backupId>")
  .description("Perform comprehensive safety validation before restore")
  .option("-d, --database <database>", "Specific database to check")
  .option("--force", "Skip confirmation prompts")
  .action(async (backupId, options) => {
    try {
      const validation = await validateRestoreWithSafety(
        backupId,
        options.database,
        {
          skipConfirmation: options.force,
          force: false,
        }
      );

      if (!validation.valid) {
        console.error(`❌ Validation failed: ${validation.error}`);
        process.exit(1);
      }

      // Display safety information
      const confirmed = await displaySafetyWarningsAndConfirm(validation);

      if (confirmed) {
        console.log(
          "\n✅ Safety validation passed. You can proceed with restore."
        );
      } else {
        console.log("\n❌ Safety validation failed or was cancelled.");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Safety check failed:", error.message);
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

// Create confirmation prompt
function createConfirmationPrompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

// Display safety warnings and get confirmation
async function displaySafetyWarningsAndConfirm(validation) {
  if (!validation.safetyChecks) {
    return true;
  }

  const { safetyChecks } = validation;

  console.log("\n" + "=".repeat(60));
  console.log("🔍 RESTORE SAFETY VALIDATION");
  console.log("=".repeat(60));

  // Display overall status
  if (safetyChecks.overallStatus === "error") {
    console.log(
      "❌ ERROR: Cannot proceed with restore due to validation errors"
    );
    return false;
  } else if (safetyChecks.overallStatus === "warning") {
    console.log("⚠️  WARNING: Restore may overwrite existing data");
  } else {
    console.log("✅ SAFE: Restore appears safe to proceed");
  }

  console.log();

  // Display database-specific information
  Object.values(safetyChecks.databases).forEach((dbCheck) => {
    console.log(`📊 Database: ${dbCheck.database}`);
    console.log(`   Collections: ${dbCheck.collections}`);
    console.log(`   Empty: ${dbCheck.isEmpty ? "Yes" : "No"}`);

    if (dbCheck.lastModified) {
      const age = Math.floor(
        (new Date() - dbCheck.lastModified) / (1000 * 60 * 60)
      );
      console.log(`   Last Modified: ${age}h ago`);
    }

    if (dbCheck.warnings.length > 0) {
      console.log(`   Warnings:`);
      dbCheck.warnings.forEach((warning) => {
        console.log(`     - ${warning}`);
      });
    }
    console.log();
  });

  // Display overall warnings
  if (safetyChecks.warnings.length > 0) {
    console.log("⚠️  Overall Warnings:");
    safetyChecks.warnings.forEach((warning) => {
      console.log(`   - ${warning}`);
    });
    console.log();
  }

  if (validation.requiresConfirmation) {
    console.log("🚨 CONFIRMATION REQUIRED");
    console.log("This restore operation may overwrite existing data.");
    console.log("Please review the information above carefully.");
    console.log();

    const answer = await createConfirmationPrompt(
      "Do you want to proceed with the restore? (yes/no): "
    );

    if (answer === "yes" || answer === "y") {
      console.log("✅ Confirmed. Proceeding with restore...");
      return true;
    } else {
      console.log("❌ Restore cancelled by user.");
      return false;
    }
  }

  return true;
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
      isConnected = true;

      // Forward backup events to the main server
      backupEventEmitter.on("backup-started", (data) => {
        if (isConnected) {
          socket.emit("backup-started", data);
        }
      });

      backupEventEmitter.on("backup-completed", (data) => {
        if (isConnected) {
          socket.emit("backup-completed", data);
        }
      });

      backupEventEmitter.on("backup-error", (data) => {
        if (isConnected) {
          socket.emit("backup-error", data);
        }
      });
    });

    socket.on("disconnect", () => {
      isConnected = false;
    });

    socket.on("connect_error", (error) => {
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
      // Connection established
    });
  }

  // Parse command line arguments
  program.parse();
}

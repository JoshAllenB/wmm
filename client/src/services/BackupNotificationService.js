/**
 * Backup Notification Service
 *
 * Handles WebSocket events related to backup operations and displays
 * appropriate toast notifications to the user.
 */

import { toast } from "../components/UI/ShadCN/hooks/use-toast";

class BackupNotificationService {
  constructor() {
    this.isInitialized = false;
    this.eventHandlers = new Map();
  }

  /**
   * Initialize the backup notification service
   * @param {Object} webSocketService - The WebSocket service instance
   */
  initialize(webSocketService) {
    if (this.isInitialized) {
      return;
    }

    this.webSocketService = webSocketService;
    this.setupEventHandlers();
    this.isInitialized = true;
  }

  /**
   * Setup event handlers for backup-related WebSocket events
   */
  setupEventHandlers() {
    // Handle backup started event
    this.eventHandlers.set("backup-started", (data) => {
      this.handleBackupStarted(data);
    });

    // Handle backup completed event
    this.eventHandlers.set("backup-completed", (data) => {
      this.handleBackupCompleted(data);
    });

    // Handle backup error event
    this.eventHandlers.set("backup-error", (data) => {
      this.handleBackupError(data);
    });

    // Subscribe to all backup events
    this.eventHandlers.forEach((handler, event) => {
      this.webSocketService.subscribe(event, handler);
    });
  }

  /**
   * Handle backup started event
   * @param {Object} data - Event data
   */
  handleBackupStarted(data) {
    toast({
      title: "🔄 Backup Started",
      description: data.message || "Automatic backup is in progress...",
      duration: 3000,
    });
  }

  /**
   * Handle backup completed event
   * @param {Object} data - Event data
   */
  handleBackupCompleted(data) {
    const successMessage =
      data.successCount === data.totalDatabases
        ? `All ${data.totalDatabases} databases backed up successfully`
        : `${data.successCount}/${data.totalDatabases} databases backed up successfully`;

    toast({
      title: "✅ Backup Completed",
      description: `${successMessage} (${data.sizeFormatted})`,
      duration: 5000,
    });
  }

  /**
   * Handle backup error event
   * @param {Object} data - Event data
   */
  handleBackupError(data) {
    toast({
      title: "❌ Backup Failed",
      description: data.error || "An error occurred during automatic backup",
      variant: "destructive",
      duration: 7000,
    });
  }

  /**
   * Cleanup event handlers
   */
  destroy() {
    if (this.webSocketService && this.eventHandlers.size > 0) {
      this.eventHandlers.forEach((handler, event) => {
        this.webSocketService.unsubscribe(event, handler);
      });
    }
    this.eventHandlers.clear();
    this.isInitialized = false;
    this.webSocketService = null;
  }
}

// Create singleton instance
const backupNotificationService = new BackupNotificationService();

export default backupNotificationService;

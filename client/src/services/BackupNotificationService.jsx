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

    // Handle restore started event
    this.eventHandlers.set("restore-started", (data) => {
      this.handleRestoreStarted(data);
    });

    // Handle restore completed event
    this.eventHandlers.set("restore-completed", (data) => {
      this.handleRestoreCompleted(data);
    });

    // Handle restore error event
    this.eventHandlers.set("restore-error", (data) => {
      this.handleRestoreError(data);
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
      action: (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-xs text-gray-500">Processing...</span>
        </div>
      ),
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
      action: (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Ready</span>
        </div>
      ),
    });
  }

  /**
   * Handle backup error event
   * @param {Object} data - Event data
   */
  handleBackupError(data) {
    console.error("❌ Backup error via WebSocket:", data);

    toast({
      title: "❌ Backup Failed",
      description: data.error || "An error occurred during automatic backup",
      variant: "destructive",
      duration: 7000,
      action: (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Error</span>
        </div>
      ),
    });
  }

  /**
   * Handle restore started event
   * @param {Object} data - Event data
   */
  handleRestoreStarted(data) {
    toast({
      title: "🔄 Restore Started",
      description: data.message || "Database restore is in progress...",
      duration: 3000,
      action: (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
          <span className="text-xs text-gray-500">Restoring...</span>
        </div>
      ),
    });
  }

  /**
   * Handle restore completed event
   * @param {Object} data - Event data
   */
  handleRestoreCompleted(data) {
    const successMessage = data.message || "Database restored successfully";

    toast({
      title: "✅ Restore Completed",
      description: successMessage,
      duration: 5000,
      action: (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Ready</span>
        </div>
      ),
    });
  }

  /**
   * Handle restore error event
   * @param {Object} data - Event data
   */
  handleRestoreError(data) {
    console.error("❌ Restore error via WebSocket:", data);

    toast({
      title: "❌ Restore Failed",
      description: data.error || "An error occurred during database restore",
      variant: "destructive",
      duration: 7000,
      action: (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Error</span>
        </div>
      ),
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

import axios from "axios";
import { webSocketService } from "./WebSocketService";

class DataExportService {
  constructor() {
    this.baseURL = `http://${import.meta.env.VITE_IP_ADDRESS}:3001/data-export`;
    this.exportStatus = {
      inProgress: false,
      progress: 0,
      message: "",
      filename: null,
      error: null,
    };
    this.statusListeners = new Set();
    this.currentUserId = null;
  }

  // Subscribe to export status updates
  subscribeToExportStatus(userId, callback) {
    console.log("Subscribing to export status updates for user:", userId);

    // Subscribe to WebSocket events for this user
    webSocketService.subscribe(`export-started-${userId}`, (data) => {
      console.log("Export started event received:", data);
      this.exportStatus = {
        inProgress: true,
        progress: 0,
        message: data.message || "Starting export process...",
        filename: null,
        error: null,
      };
      this.notifyListeners();
      callback(this.exportStatus);
    });

    webSocketService.subscribe(`export-progress-${userId}`, (data) => {
      console.log("Export progress event received:", data);
      this.exportStatus = {
        ...this.exportStatus,
        inProgress: true,
        progress: data.progress || this.exportStatus.progress,
        message: data.message || this.exportStatus.message,
      };
      this.notifyListeners();
      callback(this.exportStatus);
    });

    webSocketService.subscribe(`export-complete-${userId}`, (data) => {
      console.log("Export complete event received:", data);
      this.exportStatus = {
        inProgress: false,
        progress: 100,
        message: data.message || "Export completed successfully",
        filename: data.filename,
        error: null,
      };
      this.notifyListeners();
      callback(this.exportStatus);
    });

    webSocketService.subscribe(`export-error-${userId}`, (data) => {
      console.log("Export error event received:", data);
      this.exportStatus = {
        inProgress: false,
        progress: 0,
        message: data.message || "Export failed",
        filename: null,
        error: data.message || "Unknown error occurred",
      };
      this.notifyListeners();
      callback(this.exportStatus);
    });
  }

  // Unsubscribe from export status updates
  unsubscribeFromExportStatus(userId) {
    console.log("Unsubscribing from export status updates for user:", userId);
    webSocketService.unsubscribe(`export-started-${userId}`);
    webSocketService.unsubscribe(`export-progress-${userId}`);
    webSocketService.unsubscribe(`export-complete-${userId}`);
    webSocketService.unsubscribe(`export-error-${userId}`);
  }

  // Add a listener for status updates
  addStatusListener(listener) {
    this.statusListeners.add(listener);
    // Immediately notify with current status
    listener(this.exportStatus);
  }

  // Remove a listener
  removeStatusListener(listener) {
    this.statusListeners.delete(listener);
  }

  // Notify all listeners of status changes
  notifyListeners() {
    this.statusListeners.forEach((listener) => listener(this.exportStatus));
  }

  // Generate a monthly report
  async generateMonthlyReport(month, year, userId, username) {
    try {
      console.log("Generating monthly report:", { month, year, userId, username });
      
      // Ensure WebSocket connection
      if (!webSocketService.socket?.connected) {
        console.warn("WebSocket not connected, attempting to connect...");
        webSocketService.connect({
          query: {
            userId,
            username,
            sessionId: localStorage.getItem("sessionId"),
          },
        });
      }

      this.exportStatus = {
        inProgress: true,
        progress: 0,
        message: "Starting export process...",
        filename: null,
        error: null,
      };
      this.notifyListeners();

      const response = await axios.post(`${this.baseURL}/generate`, {
        month,
        year,
        userId,
        username,
      });

      console.log("Generate report response:", response.data);

      // If we don't receive WebSocket events within 2 seconds, update status based on HTTP response
      setTimeout(() => {
        if (this.exportStatus.inProgress) {
          console.log("No WebSocket events received, updating status from HTTP response");
          this.exportStatus = {
            inProgress: false,
            progress: 100,
            message: response.data.message,
            filename: response.data.filename,
            error: null,
          };
          this.notifyListeners();
        }
      }, 2000);

      return response.data;
    } catch (error) {
      console.error("Error generating report:", error.response || error);
      
      this.exportStatus = {
        inProgress: false,
        progress: 0,
        message: "",
        filename: null,
        error: error.response?.data?.message || error.message || "Failed to generate report",
      };
      this.notifyListeners();
      throw error;
    }
  }

  // Download a generated report
  async downloadReport(filename) {
    try {
      console.log("Downloading report:", filename);
      
      const response = await axios.get(`${this.baseURL}/download/${filename}`, {
        responseType: "blob",
        timeout: 30000, // 30 second timeout
      });

      console.log("Download response received, creating blob URL");
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      return true;
    } catch (error) {
      console.error("Error downloading report:", error.response || error);
      throw new Error(error.response?.data?.message || error.message || "Failed to download report");
    }
  }

  // Get current export status
  getExportStatus() {
    return this.exportStatus;
  }
}

const dataExportService = new DataExportService();
export { dataExportService };

import axios from "axios";
import { webSocketService } from "./WebSocketService";

// Create axios instance with base URL
const BACKEND_URL = `http://${import.meta.env.VITE_IP_ADDRESS}:3001`;
const api = axios.create({
  baseURL: BACKEND_URL,
});

class DataExportService {
  constructor() {
    this.exportStatus = {
      inProgress: false,
      progress: 0,
      message: "",
      error: null,
      filename: null,
      exportType: null, // Add export type tracking
    };
    this.statusSubscribers = new Map();
  }

  // Subscribe to export status updates for a specific user
  subscribeToExportStatus(userId, callback) {
    if (!this.statusSubscribers.has(userId)) {
      this.statusSubscribers.set(userId, new Set());
    }
    this.statusSubscribers.get(userId).add(callback);

    // Set up socket event listeners
    const startedEvent = `export-started-${userId}`;
    const progressEvent = `export-progress-${userId}`;
    const completeEvent = `export-complete-${userId}`;
    const errorEvent = `export-error-${userId}`;

    webSocketService.on(startedEvent, (data) => {
      this.updateExportStatus({
        inProgress: true,
        progress: data.progress,
        message: data.message,
        error: null,
        filename: null,
      });
    });

    webSocketService.on(progressEvent, (data) => {
      this.updateExportStatus({
        inProgress: true,
        progress: data.progress,
        message: data.message,
        error: null,
        filename: null,
      });
    });

    webSocketService.on(completeEvent, (data) => {
      const expectedPrefix =
        this.exportStatus.exportType === "HRG"
          ? "HRG_Monthly_Report"
          : "Monthly_Report";

      if (data.filename && !data.filename.startsWith(expectedPrefix)) {
        console.error(
          "Received incorrect file type:",
          data.filename,
          "expected prefix:",
          expectedPrefix
        );
        this.updateExportStatus({
          inProgress: false,
          progress: 0,
          message: `Error: Received incorrect file type`,
          error: `Expected ${expectedPrefix} file but received different type`,
          filename: null,
          exportType: null,
        });
        return;
      }

      this.updateExportStatus({
        inProgress: false,
        progress: 100,
        message: data.message,
        error: null,
        filename: data.filename,
      });
    });

    webSocketService.on(errorEvent, (data) => {
      console.error("Export error:", data);
      this.updateExportStatus({
        inProgress: false,
        progress: 0,
        message: data.message,
        error: data.message,
        filename: null,
      });
    });
  }

  // Unsubscribe from export status updates
  unsubscribeFromExportStatus(userId) {
    if (this.statusSubscribers.has(userId)) {
      this.statusSubscribers.delete(userId);
    }

    // Remove socket event listeners
    webSocketService.off(`export-started-${userId}`);
    webSocketService.off(`export-progress-${userId}`);
    webSocketService.off(`export-complete-${userId}`);
    webSocketService.off(`export-error-${userId}`);
  }

  // Update export status and notify subscribers
  updateExportStatus(newStatus) {
    this.exportStatus = { ...this.exportStatus, ...newStatus };
    this.notifySubscribers();
  }

  // Notify all subscribers of status changes
  notifySubscribers() {
    for (const [userId, callbacks] of this.statusSubscribers.entries()) {
      callbacks.forEach((callback) => callback(this.exportStatus));
    }
  }

  // Get current export status
  getExportStatus() {
    return this.exportStatus;
  }

  // Generate monthly report based on type (WMM or HRG)
  async generateMonthlyReport(month, year, userId, username, type) {
    try {
      let endpoint;
      switch (type) {
        case "HRG":
          endpoint = "/generate-hrg";
          break;
        case "WMM":
          endpoint = "/generate";
          break;
        default:
          throw new Error("Invalid export type. Must be either 'WMM' or 'HRG'");
      }

      // Update export type in status
      this.updateExportStatus({
        exportType: type,
      });

      const response = await api.post(`/data-export${endpoint}`, {
        month,
        year,
        userId,
        username,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to generate report");
      }

      return response.data;
    } catch (error) {
      // Reset export type on error
      this.updateExportStatus({
        exportType: null,
      });
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to generate report"
      );
    }
  }

  // Download file using the backend download endpoint
  async downloadFile(filename, exportType) {
    try {
      let downloadEndpoint;
      switch (exportType) {
        case "HRG":
          downloadEndpoint = `/data-export/download-hrg/${filename}`;
          break;
        case "WMM":
          downloadEndpoint = `/data-export/download/${filename}`;
          break;
        default:
          throw new Error("Invalid export type for download");
      }

      const downloadUrl = `${BACKEND_URL}${downloadEndpoint}`;

      // Method 1: Try using fetch to get the file and create blob
      try {
        const response = await fetch(downloadUrl, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the object URL
        setTimeout(() => window.URL.revokeObjectURL(url), 100);

        return { success: true, message: "Download started" };
      } catch (fetchError) {
        console.warn(
          "Fetch method failed, trying direct link method:",
          fetchError
        );

        // Method 2: Fallback to direct link method
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        link.target = "_blank";
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true, message: "Download started" };
      }
    } catch (error) {
      console.error("Download error:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to download file"
      );
    }
  }

  // Download file with custom filename
  async downloadFileWithCustomName(
    originalFilename,
    exportType,
    customFilename
  ) {
    try {
      let downloadEndpoint;
      switch (exportType) {
        case "HRG":
          downloadEndpoint = `/data-export/download-hrg/${originalFilename}`;
          break;
        case "WMM":
          downloadEndpoint = `/data-export/download/${originalFilename}`;
          break;
        default:
          throw new Error("Invalid export type for download");
      }

      const downloadUrl = `${BACKEND_URL}${downloadEndpoint}`;

      // Method 1: Try using fetch to get the file and create blob
      try {
        const response = await fetch(downloadUrl, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = customFilename;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the object URL
        setTimeout(() => window.URL.revokeObjectURL(url), 100);

        return { success: true, message: "Download started" };
      } catch (fetchError) {
        console.warn(
          "Fetch method failed, trying direct link method:",
          fetchError
        );

        // Method 2: Fallback to direct link method
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = customFilename;
        link.target = "_blank";
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true, message: "Download started" };
      }
    } catch (error) {
      console.error("Download error:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to download file"
      );
    }
  }
}

export const dataExportService = new DataExportService();

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
  }

  // Subscribe to export status updates
  subscribeToExportStatus(userId, callback) {
    // Subscribe to WebSocket events for this user
    webSocketService.subscribe(`export-started-${userId}`, (data) => {
      this.exportStatus = {
        inProgress: true,
        progress: 0,
        message: data.message,
        filename: null,
        error: null,
      };
      this.notifyListeners();
      callback(this.exportStatus);
    });

    webSocketService.subscribe(`export-progress-${userId}`, (data) => {
      this.exportStatus = {
        ...this.exportStatus,
        progress: data.progress || 0,
        message: data.message,
      };
      this.notifyListeners();
      callback(this.exportStatus);
    });

    webSocketService.subscribe(`export-complete-${userId}`, (data) => {
      this.exportStatus = {
        inProgress: false,
        progress: 100,
        message: data.message,
        filename: data.filename,
        error: null,
      };
      this.notifyListeners();
      callback(this.exportStatus);
    });

    webSocketService.subscribe(`export-error-${userId}`, (data) => {
      this.exportStatus = {
        inProgress: false,
        progress: 0,
        message: "",
        filename: null,
        error: data.message,
      };
      this.notifyListeners();
      callback(this.exportStatus);
    });
  }

  // Unsubscribe from export status updates
  unsubscribeFromExportStatus(userId) {
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

      return response.data;
    } catch (error) {
      this.exportStatus = {
        inProgress: false,
        progress: 0,
        message: "",
        filename: null,
        error: error.response?.data?.message || error.message,
      };
      this.notifyListeners();
      throw error;
    }
  }

  // Download a generated report
  async downloadReport(filename) {
    try {
      const response = await axios.get(`${this.baseURL}/download/${filename}`, {
        responseType: "blob",
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error("Error downloading report:", error);
      throw error;
    }
  }

  // Get current export status
  getExportStatus() {
    return this.exportStatus;
  }
}

const dataExportService = new DataExportService();
export { dataExportService };

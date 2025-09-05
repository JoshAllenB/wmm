import axios from "axios";
import { webSocketService } from "./WebSocketService";

// Create axios instance with base URL
const BACKEND_URL = `http://${import.meta.env.VITE_IP_ADDRESS}:3001`;
const api = axios.create({
  baseURL: BACKEND_URL
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
    console.log('Subscribing to export status for user:', userId);
    if (!this.statusSubscribers.has(userId)) {
      this.statusSubscribers.set(userId, new Set());
    }
    this.statusSubscribers.get(userId).add(callback);

    // Set up socket event listeners
    const startedEvent = `export-started-${userId}`;
    const progressEvent = `export-progress-${userId}`;
    const completeEvent = `export-complete-${userId}`;
    const errorEvent = `export-error-${userId}`;

    console.log('Setting up socket event listeners:', {
      startedEvent,
      progressEvent,
      completeEvent,
      errorEvent
    });

    webSocketService.on(startedEvent, (data) => {
      console.log('Export started:', data);
      this.updateExportStatus({
        inProgress: true,
        progress: data.progress,
        message: data.message,
        error: null,
        filename: null,
      });
    });

    webSocketService.on(progressEvent, (data) => {
      console.log('Export progress:', data);
      this.updateExportStatus({
        inProgress: true,
        progress: data.progress,
        message: data.message,
        error: null,
        filename: null,
      });
    });

    webSocketService.on(completeEvent, (data) => {
      console.log('Export complete event received:', data);
      const expectedPrefix = this.exportStatus.exportType === 'HRG' ? 'HRG_Monthly_Report' : 'Monthly_Report';
      
      if (data.filename && !data.filename.startsWith(expectedPrefix)) {
        console.error('Received incorrect file type:', data.filename, 'expected prefix:', expectedPrefix);
        this.updateExportStatus({
          inProgress: false,
          progress: 0,
          message: `Error: Received incorrect file type`,
          error: `Expected ${expectedPrefix} file but received different type`,
          filename: null,
          exportType: null
        });
        return;
      }

      this.updateExportStatus({
        inProgress: false,
        progress: 100,
        message: data.message,
        error: null,
        filename: data.filename
      });
      
      // Automatically trigger download when export is complete
      if (data.filename) {
        console.log('Initiating automatic download for:', data.filename);
        this.downloadReport(data.filename).catch(error => {
          console.error('Download error:', error);
          this.updateExportStatus({
            error: `Download failed: ${error.message}`
          });
        });
      } else {
        console.warn('No filename received in export-complete event');
      }
    });

    webSocketService.on(errorEvent, (data) => {
      console.error('Export error:', data);
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
        exportType: type
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
        exportType: null
      });
      throw new Error(
        error.response?.data?.message || error.message || "Failed to generate report"
      );
    }
  }

  // Download generated report
  async downloadReport(filename) {
    try {
      console.log('Starting download for file:', filename);
      const downloadUrl = `${BACKEND_URL}/data-export/download/${filename}`;
      console.log('Download URL:', downloadUrl);

      console.log('Making download request...');
      const response = await api.get(`/data-export/download/${filename}`, {
        responseType: "blob",
      });

      console.log('Download response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        dataType: response.data?.type,
        dataSize: response.data?.size
      });

      if (!response.data) {
        throw new Error('No data received in response');
      }

      if (response.data.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      if (response.data.type === 'application/json') {
        // Server might have sent an error response as JSON
        const reader = new FileReader();
        reader.onload = () => {
          const errorData = JSON.parse(reader.result);
          console.error('Server returned JSON instead of file:', errorData);
          throw new Error(errorData.message || 'Server returned error response');
        };
        reader.readAsText(response.data);
        return;
      }

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      console.log('Created blob URL:', url);
      
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      
      console.log('Triggering download with link:', {
        href: link.href,
        download: link.download,
        filename: filename
      });
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('Download cleanup completed');
      }, 100);
      
      console.log('Download process completed successfully');
      return true;
    } catch (error) {
      console.error('Download error details:', {
        error,
        message: error.message,
        response: error.response,
        request: error.request,
        stack: error.stack
      });
      
      // Check if we have a specific error message from the server
      const serverError = error.response?.data;
      if (serverError && typeof serverError === 'object') {
        throw new Error(serverError.message || 'Failed to download report');
      }
      
      throw new Error(
        error.response?.data?.message || error.message || "Failed to download report"
      );
    }
  }
}

export const dataExportService = new DataExportService();

import axios from "axios";
import errorHandler from "./errorHandler";

const API_URL = `http://${import.meta.env.VITE_IP_ADDRESS}:3001`;

// Create axios instance with default configs
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout for backup operations
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    errorHandler.handleAxiosError(error, {
      shouldLogout: false,
      shouldClearCache: true,
    });
    return Promise.reject(error);
  }
);

// Backup-related API calls
const backupService = {
  // Get backup service status
  getStatus: async () => {
    try {
      const response = await apiClient.get("/api/backup/status");
      return response.data;
    } catch (error) {
      console.error("Error fetching backup status:", error);
      throw error;
    }
  },

  // Test MongoDB connections
  testConnections: async () => {
    try {
      const response = await apiClient.get("/api/backup/connection-test");
      return response.data;
    } catch (error) {
      console.error("Error testing MongoDB connections:", error);
      throw error;
    }
  },

  // List all available backups
  listBackups: async () => {
    try {
      const response = await apiClient.get("/api/backup/list");
      return response.data;
    } catch (error) {
      console.error("Error listing backups:", error);
      throw error;
    }
  },

  // Create a new backup
  createBackup: async (options = {}) => {
    try {
      const response = await apiClient.post("/api/backup/create", options);
      return response.data;
    } catch (error) {
      console.error("Error creating backup:", error);
      throw error;
    }
  },

  // Create a full backup of all databases
  createFullBackup: async (options = {}) => {
    try {
      const response = await apiClient.post("/api/backup/create-full", options);
      return response.data;
    } catch (error) {
      console.error("Error creating full backup:", error);
      throw error;
    }
  },

  // Create a backup of a specific database
  createDatabaseBackup: async (database, options = {}) => {
    try {
      const response = await apiClient.post("/api/backup/create-database", {
        database,
        ...options,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating database backup:", error);
      throw error;
    }
  },

  // Download a backup as a compressed archive
  downloadBackup: async (backupId, customFilename = null) => {
    try {
      const response = await apiClient.get(`/api/backup/download/${backupId}`, {
        responseType: "blob",
      });

      // Create blob URL for download
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement("a");
      link.href = url;
      link.download = customFilename || `${backupId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      window.URL.revokeObjectURL(url);

      return { success: true, message: "Backup downloaded successfully" };
    } catch (error) {
      console.error("Error downloading backup:", error);
      throw error;
    }
  },

  // Delete a specific backup
  deleteBackup: async (backupId) => {
    try {
      const response = await apiClient.delete(`/api/backup/${backupId}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting backup:", error);
      throw error;
    }
  },

  // Clean up old backups
  cleanupBackups: async () => {
    try {
      const response = await apiClient.post("/api/backup/cleanup");
      return response.data;
    } catch (error) {
      console.error("Error cleaning up backups:", error);
      throw error;
    }
  },

  // Get detailed information about a specific backup
  getBackupInfo: async (backupId) => {
    try {
      const response = await apiClient.get(`/api/backup/info/${backupId}`);
      return response.data;
    } catch (error) {
      console.error("Error getting backup info:", error);
      throw error;
    }
  },

  // Download backup with progress tracking
  downloadBackupWithProgress: async (
    backupId,
    customFilename = null,
    onProgress = null
  ) => {
    try {
      const response = await apiClient.get(`/api/backup/download/${backupId}`, {
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(
              percentCompleted,
              progressEvent.loaded,
              progressEvent.total
            );
          }
        },
      });

      // Create blob URL for download
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement("a");
      link.href = url;
      link.download = customFilename || `${backupId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      window.URL.revokeObjectURL(url);

      return { success: true, message: "Backup downloaded successfully" };
    } catch (error) {
      console.error("Error downloading backup with progress:", error);
      throw error;
    }
  },

  // Restore database(s) from backup
  restoreFromBackup: async (backupId, options = {}) => {
    try {
      const response = await apiClient.post(
        `/api/backup/restore/${backupId}`,
        options
      );
      return response.data;
    } catch (error) {
      console.error("Error restoring from backup:", error);
      throw error;
    }
  },

  // Restore a specific database from backup
  restoreDatabase: async (backupId, database, options = {}) => {
    try {
      const response = await apiClient.post(
        `/api/backup/restore-database/${backupId}`,
        {
          database,
          ...options,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error restoring database:", error);
      throw error;
    }
  },

  // Restore all databases from a full backup
  restoreFullBackup: async (backupId, options = {}) => {
    try {
      const response = await apiClient.post(
        `/api/backup/restore-full/${backupId}`,
        options
      );
      return response.data;
    } catch (error) {
      console.error("Error restoring full backup:", error);
      throw error;
    }
  },

  // Validate a backup for restore operations
  validateBackup: async (backupId, database = null) => {
    try {
      const params = database ? { database } : {};
      const response = await apiClient.get(`/api/backup/validate/${backupId}`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error validating backup:", error);
      throw error;
    }
  },

  // Perform comprehensive safety validation before restore
  safetyCheck: async (backupId, database = null, options = {}) => {
    try {
      const params = {
        ...(database ? { database } : {}),
        ...(options.skipConfirmation ? { skipConfirmation: true } : {}),
        ...(options.force ? { force: true } : {}),
      };
      const response = await apiClient.get(
        `/api/backup/safety-check/${backupId}`,
        {
          params,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error performing safety check:", error);
      throw error;
    }
  },
};

export default backupService;

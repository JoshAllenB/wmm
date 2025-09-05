import { webSocketService } from "./WebSocketService";
import { removeTokens } from "../utils/Token/tokenStorage";
import setAuthToken from "../utils/Token/setAuthToken";

class ErrorHandler {
  constructor() {
    this.isHandlingError = false;
    this.errorQueue = [];
  }

  /**
   * Centralized error handling for axios errors
   * @param {Error} error - The axios error object
   * @param {Object} options - Additional options
   * @param {boolean} options.shouldLogout - Whether to trigger logout (default: true)
   * @param {boolean} options.shouldClearCache - Whether to clear cache (default: true)
   */
  handleAxiosError(error, options = {}) {
    const { shouldLogout = true, shouldClearCache = true } = options;

    console.error("[ErrorHandler] Axios error:", error);

    // Check for specific error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - always logout
          this.triggerLogout("Your session has expired. Please log in again.");
          break;
        case 403:
          // Forbidden - usually means session issues
          this.triggerLogout("Access denied. Please log in again.");
          break;
        case 404:
          // Not found - clear cache but don't logout
          if (shouldClearCache) {
            this.clearCache();
          }
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors - clear cache but don't logout
          if (shouldClearCache) {
            this.clearCache();
          }
          break;
        default:
          // Other errors - clear cache but don't logout unless specified
          if (shouldClearCache) {
            this.clearCache();
          }
          if (shouldLogout) {
            this.triggerLogout("An error occurred. Please try again.");
          }
      }
    } else if (error.request) {
      // Network error - no response received
      console.error("[ErrorHandler] Network error:", error.message);
      if (shouldClearCache) {
        this.clearCache();
      }
      if (shouldLogout) {
        this.triggerLogout(
          "Network connection error. Please check your connection and try again."
        );
      }
    } else {
      // Other errors (timeout, etc.)
      console.error("[ErrorHandler] Other error:", error.message);
      if (shouldClearCache) {
        this.clearCache();
      }
      if (shouldLogout) {
        this.triggerLogout("An unexpected error occurred. Please try again.");
      }
    }
  }

  /**
   * Handle WebSocket errors
   * @param {string} errorType - Type of websocket error
   * @param {Error} error - The error object
   */
  handleWebSocketError(errorType, error) {
    console.error(`[ErrorHandler] WebSocket ${errorType}:`, error);

    switch (errorType) {
      case "connection_error":
        // Connection failed - clear cache and logout
        this.clearCache();
        this.triggerLogout("WebSocket connection failed. Please log in again.");
        break;
      case "max_reconnect_attempts":
        // Max reconnection attempts reached
        this.clearCache();
        this.triggerLogout("Connection lost. Please log in again.");
        break;
      case "session_not_found":
        // No websocket for this user
        this.clearCache();
        this.triggerLogout("Session not found. Please log in again.");
        break;
      case "data_sync_error":
        // Data sync failed - clear cache but don't logout
        this.clearCache();
        break;
      case "server_error":
        // Server websocket error
        this.clearCache();
        this.triggerLogout("WebSocket server error. Please log in again.");
        break;
      default:
        // Unknown websocket error
        this.clearCache();
        this.triggerLogout("WebSocket error occurred. Please log in again.");
    }
  }

  /**
   * Clear all cached data and session information
   */
  clearCache() {
    // Clear localStorage
    const keysToRemove = [
      "accessToken",
      "refreshToken",
      "tokenExpiresAt",
      "sessionId",
      "userId",
      "username",
      "errorMessage",
      "sessionExpired",
    ];

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Clear any other cached data
    if (window.caches) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }

    // Clear WebSocket session
    webSocketService.clearSession();

    // Clear auth headers
    removeTokens();
    setAuthToken(null);
  }

  /**
   * Trigger logout with optional message
   * @param {string} message - Error message to display
   */
  triggerLogout(message = "You have been logged out.") {
    if (this.isHandlingError) {
      // Prevent multiple simultaneous logout attempts
      this.errorQueue.push(message);
      return;
    }

    this.isHandlingError = true;

    // Clear cache first
    this.clearCache();

    // Set error message for login page
    setTimeout(() => {
      localStorage.setItem("errorMessage", message);

      // Set session expired flag if it's an inactivity timeout
      if (message.includes("inactivity")) {
        localStorage.setItem("sessionExpired", "true");
      } else {
        localStorage.removeItem("sessionExpired"); // Ensure this is not set for other logout reasons
      }

      // Redirect to login page
      if (
        window.location.pathname !== "/" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/";
      }

      // Reset error handling flag after a delay
      setTimeout(() => {
        this.isHandlingError = false;

        // Process any queued errors
        if (this.errorQueue.length > 0) {
          const nextMessage = this.errorQueue.shift();
          this.triggerLogout(nextMessage);
        }
      }, 1000);
    }, 100);
  }

  /**
   * Handle "No websocket for this user" error specifically
   */
  handleNoWebSocketForUser() {
    console.error("[ErrorHandler] No websocket for this user");
    this.handleWebSocketError(
      "session_not_found",
      new Error("No websocket for this user")
    );
  }

  /**
   * Handle specific error messages that indicate websocket issues
   * @param {string} errorMessage - The error message to check
   */
  handleSpecificError(errorMessage) {
    const lowerMessage = errorMessage.toLowerCase();

    if (
      lowerMessage.includes("no websocket for this user") ||
      (lowerMessage.includes("websocket") && lowerMessage.includes("user"))
    ) {
      this.handleNoWebSocketForUser();
      return true;
    }

    if (lowerMessage.includes("session") && lowerMessage.includes("expired")) {
      this.triggerLogout("Your session has expired. Please log in again.");
      return true;
    }

    if (
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("forbidden")
    ) {
      this.triggerLogout("Access denied. Please log in again.");
      return true;
    }

    return false;
  }

  /**
   * Reset error handling state
   */
  reset() {
    this.isHandlingError = false;
    this.errorQueue = [];
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

export default errorHandler;

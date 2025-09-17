import axios from "axios";
import errorHandler from "./errorHandler";

// Create a global axios interceptor to catch all errors
const setupGlobalAxiosInterceptor = () => {
  // Response interceptor for all axios instances
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // Skip if this is already being handled by userService interceptor
      if (error.config && error.config._handledByUserService) {
        return Promise.reject(error);
      }

      // Mark this error as handled to prevent double handling
      if (error.config) {
        error.config._handledByUserService = true;
      }

      // Use centralized error handler for all axios errors
      errorHandler.handleAxiosError(error, {
        shouldLogout: false,
        shouldClearCache: true,
      });

      return Promise.reject(error);
    }
  );

  // Request interceptor to add auth token to all requests
  axios.interceptors.request.use(
    (config) => {
      // Skip if this is already being handled by userService interceptor
      if (config._handledByUserService) {
        return config;
      }

      // Mark this request as handled to prevent double handling
      config._handledByUserService = true;

      // Skip attaching auth for auth endpoints
      const url = (config.url || "").toLowerCase();
      const isAuthEndpoint =
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/verifytoken") ||
        url.includes("/auth/refreshtoken");

      // Add auth token if available and not an auth endpoint
      const token = localStorage.getItem("accessToken");
      if (!isAuthEndpoint && token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};

export default setupGlobalAxiosInterceptor;

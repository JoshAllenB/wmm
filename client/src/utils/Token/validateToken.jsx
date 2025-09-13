import axios from "axios";
import { jwtDecode } from "jwt-decode";
import setAuthToken from "./setAuthToken";
import {
  getAccessToken,
  getRefreshToken,
  removeTokens,
  setTokens,
} from "./tokenStorage";
import { redirectToLogin } from "../ActivityMonitor";
import errorHandler from "../../services/errorHandler";

// Debounce token validation to prevent excessive calls
let validationInProgress = false;
let lastValidationTime = 0;
let validationPromise = null;
const VALIDATION_DEBOUNCE_MS = 5000; // 5 seconds

const decodeToken = (token) => {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error("Token decoding error:", error);
    return null;
  }
};

const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
};

const shouldRefreshToken = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;

  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const timeUntilExpiry = expirationTime - currentTime;

  // Refresh if token expires in less than 5 minutes
  return timeUntilExpiry < 5 * 60 * 1000;
};

const refreshAndValidate = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    removeTokens();
    console.error("No refresh token found");
    return false;
  }

  try {
    const { data } = await axios.post(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/auth/refreshToken`,
      { token: refreshToken },
      { _isTokenRefresh: true }
    );
    const { token, refreshToken: newRefreshToken, tokenExpiresAt } = data;
    setTokens(token, newRefreshToken, tokenExpiresAt);
    setAuthToken(token);

    const response = await axios.post(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/auth/verifyToken`,
      { token }
    );
    if (response.data.valid) {
      return response.data.user;
    }
    return false;
  } catch (refreshError) {
    console.error("Token refresh error:", refreshError);
    // Use centralized error handler for token refresh errors
    errorHandler.handleAxiosError(refreshError, {
      shouldLogout: true,
      shouldClearCache: true,
    });
    return false;
  }
};

const validateToken = async () => {
  const token = getAccessToken();
  if (!token) {
    return false;
  }

  // If validation is already in progress, return the existing promise
  if (validationInProgress && validationPromise) {
    return validationPromise;
  }

  // Debounce validation calls to prevent excessive API requests
  const now = Date.now();
  if (now - lastValidationTime < VALIDATION_DEBOUNCE_MS) {
    return true; // Assume valid if recently validated
  }

  validationInProgress = true;
  lastValidationTime = now;

  // Create a promise that can be shared across concurrent calls
  validationPromise = (async () => {
    try {
      // Check if token is expired
      if (isTokenExpired(token)) {
        return await refreshAndValidate();
      }

      // Check if token should be refreshed proactively
      if (shouldRefreshToken(token)) {
        const refreshResult = await refreshAndValidate();
        if (refreshResult) {
          return refreshResult;
        }
        // If refresh failed, continue with current token validation
      }

      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/auth/verifyToken`,
        { token }
      );
      if (response.data.valid) {
        setAuthToken(token);
        return response.data.user;
      } else {
        // Handle invalid token case - try refresh before giving up
        const refreshResult = await refreshAndValidate();
        if (!refreshResult) {
          removeTokens();
        }
        return refreshResult;
      }
    } catch (error) {
      console.error("Token validation error:", error);

      // Handle specific error cases
      if (error.response) {
        const { status, data } = error.response;

        if (status === 401) {
          // Token is invalid or expired - try refresh
          const refreshResult = await refreshAndValidate();
          if (!refreshResult) {
            // Use centralized error handler for token validation errors
            errorHandler.handleAxiosError(error, {
              shouldLogout: true,
              shouldClearCache: true,
            });
          }
          return refreshResult;
        } else if (status === 500) {
          // Server error - don't logout, just return false
          console.error("Server error during token validation:", data);
          return false;
        }
      }

      // For network errors or other issues, don't logout immediately
      console.error(
        "Token validation failed due to network or other error:",
        error.message
      );
      return false;
    } finally {
      validationInProgress = false;
      validationPromise = null;
    }
  })();

  return validationPromise;
};

export default validateToken;

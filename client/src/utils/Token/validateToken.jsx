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
      { token: refreshToken }
    );
    const { token, refreshToken: newRefreshToken } = data;
    setTokens(token, newRefreshToken);
    setAuthToken(token);

    const response = await axios.post(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/auth/verifyToken`,
      { token }
    );
    return response.data.valid ? response.data.user : false;
  } catch (refreshError) {
    console.error("Token refresh error:", refreshError);
    removeTokens();
    return false;
  }
};

const validateToken = async () => {
  const token = getAccessToken();
  if (!token) {
    return false;
  }

  // First check if token is expired without making an API call
  if (isTokenExpired(token)) {
    return await refreshAndValidate();
  }

  try {
    const response = await axios.post(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/auth/verifyToken`,
      { token }
    );
    if (response.data.valid) {
      setAuthToken(token);
      return response.data.user;
    } else {
      // Handle invalid token case
      const refreshResult = await refreshAndValidate();
      if (!refreshResult) {
        removeTokens();
      }
      return refreshResult;
    }
  } catch (error) {
    console.error("Token validation error:", error);
    // If error status is 401, try refresh
    if (error.response && error.response.status === 401) {
      const refreshResult = await refreshAndValidate();
      if (!refreshResult) {
        removeTokens();
      }
      return refreshResult;
    }
    return false;
  }
};

export default validateToken;

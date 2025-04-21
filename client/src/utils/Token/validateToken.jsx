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

const refreshAndValidate = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    removeTokens();
    console.error("No refresh token found");
    // Redirect to login if refresh token is missing
    redirectToLogin();
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
    // Redirect to login on refresh failure
    redirectToLogin();
    return false;
  }
};

const validateToken = async () => {
  const token = getAccessToken();
  if (!token) {
    // No token found, should redirect to login
    redirectToLogin();
    return false;
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
        // If refresh fails, clear tokens and redirect
        removeTokens();
        redirectToLogin();
      }
      return refreshResult;
    }
  } catch (error) {
    console.error("Token validation error:", error);
    // If error status is 401, clear tokens immediately
    if (error.response && error.response.status === 401) {
      removeTokens();
      redirectToLogin();
      return false;
    }
    return refreshAndValidate();
  }
};

export default validateToken;

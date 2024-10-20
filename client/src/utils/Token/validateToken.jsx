import axios from "axios";
import * as jwtDecode from "jwt-decode"; // Changed import statement
import setAuthToken from "./setAuthToken";
import {
  getAccessToken,
  getRefreshToken,
  removeTokens,
  setTokens,
} from "./tokenStorage";

const validateToken = async () => {
  const token = getAccessToken();
  if (!token) {
    return false;
  }
  try {
    const decodedToken = jwtDecode.jwtDecode(token); // Use jwtDecode.jwtDecode instead of jwt_decode

    // Check if the token is expired
    if (Date.now() >= decodedToken.exp * 1000) {
      console.log("Token expired, attempting refresh...");
      return await refreshAndValidate();
    }

    console.log("decoded:", {
      id: decodedToken.userId,
      roles: decodedToken.roles,
    });

    setAuthToken(token);
    return {
      id: decodedToken.userId,
      roles: decodedToken.roles,
    };
  } catch (error) {
    console.error("Token validation error:", error);
    if (error.name === "InvalidTokenError") {
      console.error("Invalid token");
      removeTokens();
      return false;
    }
    // If it's not an invalid token error, attempt to refresh
    return await refreshAndValidate();
  }
};

const refreshAndValidate = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    removeTokens();
    console.error("No refresh token found");
    return false;
  }
  try {
    const refreshResponse = await axios.post(
      "http://localhost:3001/auth/refreshToken",
      { refreshToken }
    );
    const { token, refreshToken: newRefreshToken } = refreshResponse.data;
    setTokens(token, newRefreshToken);
    setAuthToken(token);

    // Decode the new token instead of making another API call
    const decodedToken = jwtDecode.jwtDecode(token);
    return {
      id: decodedToken.userId,
      roles: decodedToken.roles,
    };
  } catch (refreshError) {
    console.error("Token refresh error:", refreshError);
    removeTokens();
  }
  return false;
};

export default validateToken;

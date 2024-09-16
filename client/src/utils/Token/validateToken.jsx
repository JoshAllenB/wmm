import axios from "axios";
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
    const response = await axios.post(
      "http://localhost:3001/auth/verifyToken",
      { token },
    );
    if (response.data.valid) {
      setAuthToken(token);
      return response.data.user;
    }
  } catch (error) {
    console.error("Full error object:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);

      if (error.response.status === 401) {
        if (error.response.data.expired) {
          console.log("Token expired, attempting refresh...");
          return await refreshAndValidate();
        } else if (error.response.data.error === "Invalid token") {
          console.error("Invalid token");
          removeTokens();
          return false;
        }
      }
    }
    console.error("Token validation error:", error);
    removeTokens();
  }
  return false;
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
      { refreshToken },
    );
    const { token, refresthToken: newRefreshToken } = refreshResponse.data;
    setTokens(token, newRefreshToken);
    setAuthToken(token);

    const newValidResponse = await axios.post(
      "http://localhost:3001/auth/verifyToken",
      { token },
    );
    if (newValidResponse.data.valid) {
      return newValidResponse.data.user;
    }
  } catch (refreshError) {
    console.error("Token refresh error:", refreshError);
    removeTokens();
  }

  return false;
};

export default validateToken;

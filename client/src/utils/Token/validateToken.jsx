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
      { token }
    );
    if (response.data.valid) {
      setAuthToken(token);
      return response.data.user;
    }
  } catch (error) {
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.data.expired
    ) {
      console.error("Token expired, attempting refresh...");
      return await refreshAndValidate();
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
      { refreshToken }
    );
    const { token, refresthToken: newRefreshToken } = refreshResponse.data;
    setTokens(token, newRefreshToken);
    setAuthToken(token);

    const newValidResponse = await axios.post(
      "http://localhost:3001/auth/verifyToken",
      { token }
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

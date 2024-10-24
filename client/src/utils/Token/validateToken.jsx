import axios from "axios";
import { jwtDecode } from "jwt-decode";
import setAuthToken from "./setAuthToken";
import {
  getAccessToken,
  getRefreshToken,
  removeTokens,
  setTokens,
} from "./tokenStorage";

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
    return false;
  }
  try {
    const { data } = await axios.post(
      "http://localhost:3001/auth/refreshToken",
      { token: refreshToken }
    );
    const { token, refreshToken: newRefreshToken } = data;
    setTokens(token, newRefreshToken);
    setAuthToken(token);

    const response = await axios.post("http://localhost:3001/auth/verifyToken", { token });
    return response.data.valid ? response.data.user : false;
  } catch (refreshError) {
    console.error("Token refresh error:", refreshError);
    removeTokens();
    return false;
  }
};

const validateToken = async () => {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const response = await axios.post(
      "http://localhost:3001/auth/verifyToken",
      { token }
    );
    if (response.data.valid) {
      setAuthToken(token);
      return response.data.user;
    } else {
      return refreshAndValidate();
    }
  } catch (error) {
    console.error("Token validation error:", error);
    return refreshAndValidate();
  }
};

export default validateToken;

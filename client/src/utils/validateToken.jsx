import axios from "axios";
import setAuthToken from "./setAuthToken";
import { getToken, removeToken, setToken } from "./tokenStorage";

const validateToken = async () => {
  const token = getToken();
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
    if (error.response && error.response.status === 401) {
      if (getToken()) {
        try {
          const refreshResponse = await axios.post(
            "http://localhost:3001/auth/refreshToken",
            { token }
          );
          if (refreshResponse.data.token) {
            setToken(refreshResponse.data.token);
            setAuthToken(refreshResponse.data.token);

            const newValidResponse = await axios.post(
              "http://localhost:3001/auth/verifyToken",
              { token: refreshResponse.data.token }
            );
            if (newValidResponse.data.valid) {
              return newValidResponse.data.user;
            }
          }
        } catch (refreshError) {
          removeToken();
        }
      }
    } else {
      console.error("Token validation error:", error);
      removeToken();
    }
  }

  return false;
};

export default validateToken;

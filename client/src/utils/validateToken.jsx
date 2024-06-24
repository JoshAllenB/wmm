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
      
      try {
        const refreshReponse = await axios.post(
          "http://localhost:3001/auth/refreshToken",
          { token }
        );
        if (refreshReponse.data.token) {
          setToken(refreshReponse.data.token);
          setAuthToken(refreshReponse.data.token);

          const newValidationReponse = await axios.post(
            "http://localhost:3001/auth/verifyToken",
            { token: refreshReponse.data.token }
          );
          if (newValidationReponse.data.valid) {
            return newValidationReponse.data.user;
          }
        }
      } catch (refreshError) {
        removeToken();
      }
    } else {
      console.error("Token validation error:", error);
      removeToken();
    }
  }

  return false;
};

export default validateToken;

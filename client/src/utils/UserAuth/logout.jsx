import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import setAuthToken from "../Token/setAuthToken";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "../../components/UI/ShadCN/dropdown-menu";
import { removeTokens } from "../Token/tokenStorage";
import { redirectToLogin } from "../ActivityMonitor";
import errorHandler from "../../services/errorHandler";

export default function Logout({ setIsLoggedIn }) {
  const navigate = useNavigate();
  const [position, setPosition] = useState("bottom");

  const handleLogout = async () => {
    try {
      const token =
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken");
      const sessionId = localStorage.getItem("sessionId");
      if (!token) {
        console.error("No token found");
        // Still perform cleanup and redirect
        performLogoutCleanup();
        return;
      }

      try {
        const response = await axios.post(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log("Logout response:", response.data);
      } catch (error) {
        console.error("Error during logout API call:", error);
        // Use centralized error handler for logout errors
        errorHandler.handleAxiosError(error, {
          shouldLogout: false,
          shouldClearCache: true,
        });
      }

      // Always perform cleanup regardless of API success
      performLogoutCleanup();
    } catch (err) {
      console.error("Unexpected error during logout:", err);
      // Ensure cleanup happens even on unexpected errors
      performLogoutCleanup();
    }
  };

  const performLogoutCleanup = () => {
    // Use centralized error handler for logout cleanup
    errorHandler.clearCache();

    // Update app state
    setIsLoggedIn(false);

    // Clear session expired flag since this is a manual logout
    localStorage.removeItem("sessionExpired");

    // Set logout success message
    setTimeout(() => {
      localStorage.setItem(
        "errorMessage",
        "You have been logged out successfully."
      );
    }, 100);

    navigate("/");
  };

  return (
    <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
      <DropdownMenuRadioItem onClick={handleLogout}>
        Logout
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}

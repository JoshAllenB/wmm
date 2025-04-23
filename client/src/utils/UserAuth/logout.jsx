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
        // Continue with cleanup even if the API call fails
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
    // Clear all tokens and session data
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("refreshToken");
    localStorage.removeItem("sessionId");
    
    // Clear session expired flags and any existing error messages
    localStorage.removeItem("errorMessage");
    localStorage.removeItem("sessionExpired");
    sessionStorage.removeItem("errorMessage");
    sessionStorage.removeItem("sessionExpired");
    
    // Clear auth headers
    removeTokens();
    setAuthToken(null);
    
    // Update app state
    setIsLoggedIn(false);
    
    // Use a different approach for logout message - set it AFTER clearing previous messages
    // with a small delay to ensure the state is properly cleared first
    setTimeout(() => {
      localStorage.setItem("errorMessage", "You have been logged out successfully.");
      // Make sure session expired flag stays removed
      localStorage.removeItem("sessionExpired");
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

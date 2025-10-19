import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export const useUserPreferences = () => {
  const [inactivityTimeout, setInactivityTimeout] = useState(900); // Default 15 minutes
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/users/preferences`
        );
        setInactivityTimeout(response.data.inactivityTimeout || 900);
        setError(null);
      } catch (err) {
        console.error("Error fetching user preferences:", err);
        setError("Failed to load preferences");
        // Keep default value on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  // Update user preferences
  const updateInactivityTimeout = useCallback(async (timeoutSeconds) => {
    try {
      const response = await axios.put(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/users/preferences`,
        { inactivityTimeout: timeoutSeconds }
      );
      setInactivityTimeout(response.data.inactivityTimeout);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error("Error updating user preferences:", err);
      const errorMsg =
        err.response?.data?.error || "Failed to update preferences";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  return {
    inactivityTimeout,
    isLoading,
    error,
    updateInactivityTimeout,
  };
};

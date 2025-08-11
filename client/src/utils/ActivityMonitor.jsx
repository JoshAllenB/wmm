import { useState, useEffect, useCallback, createContext } from "react";
import { getAccessToken, removeTokens } from "./Token/tokenStorage";
import InactivityWarning from "../components/UI/InactivityWarning";
import validateToken from "./Token/validateToken";
import errorHandler from "../services/errorHandler";

const WARNING_DURATION = 30_000; // 30 seconds warning before logout

export const ActivityContext = createContext();

// Function to handle redirect to login (can be shared across components)
export const redirectToLogin = () => {
  // Use centralized error handler for session expiration
  errorHandler.triggerLogout(
    "Your session has expired due to inactivity. Please log in again."
  );
};

const ActivityMonitor = ({
  isLoggedIn,
  setIsLoggedIn,
  setErrorMessage,
  inactivityTimeout,
  children,
}) => {
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isInactive, setIsInactive] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(WARNING_DURATION);

  const resetActivityTimer = useCallback(() => {
    setLastActivity(Date.now());
    setIsInactive(false);
    setShowWarning(false);
    setRemainingTime(WARNING_DURATION);
  }, []);

  // Check token validity on page load/refresh
  useEffect(() => {
    const checkTokenOnLoad = async () => {
      if (isLoggedIn) {
        const token = getAccessToken();
        if (!token) {
          setIsLoggedIn(false);
          return;
        }

        const validationResult = await validateToken();
        if (!validationResult) {
          setIsLoggedIn(false);
          return;
        }

        // Clear any stale session expired messages only if user is actually logged in
        // Don't clear if user was actually logged out due to inactivity
        const sessionExpired = localStorage.getItem("sessionExpired");
        const errorMessage = localStorage.getItem("errorMessage");

        // Only clear if the error message is not related to inactivity timeout
        if (
          sessionExpired &&
          errorMessage &&
          !errorMessage.includes("inactivity")
        ) {
          localStorage.removeItem("sessionExpired");
          localStorage.removeItem("errorMessage");
        }
      }
    };

    checkTokenOnLoad();
  }, [isLoggedIn, setIsLoggedIn]);

  // Handle activity check
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const activityCheck = setInterval(() => {
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - lastActivity;
      const timeUntilInactive = inactivityTimeout * 1000 - WARNING_DURATION;

      // Show warning when approaching timeout
      if (timeSinceLastActivity > timeUntilInactive && !showWarning) {
        setShowWarning(true);
        setIsInactive(true);
      }
    }, 1000);

    return () => {
      clearInterval(activityCheck);
    };
  }, [isLoggedIn, lastActivity, inactivityTimeout, showWarning]);

  // Handle countdown and logout
  useEffect(() => {
    if (isInactive && showWarning) {
      const countdownInterval = setInterval(() => {
        setRemainingTime((prev) => {
          const newTime = prev - 1000;

          if (newTime <= 0) {
            clearInterval(countdownInterval);
            // Close the warning dialog immediately
            setShowWarning(false);
            setIsInactive(false);
            // Perform logout
            setIsLoggedIn(false);
            removeTokens();
            // Set session expired flag to prevent incorrect messages on reload
            localStorage.setItem("sessionExpired", "true");
            redirectToLogin();
            return 0;
          }

          return newTime;
        });
      }, 1000);

      return () => {
        clearInterval(countdownInterval);
      };
    }
  }, [isInactive, showWarning, setIsLoggedIn]);

  // Event listeners for user activity
  useEffect(() => {
    const handleActivity = () => resetActivityTimer();

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keypress", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keypress", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [resetActivityTimer]);

  const handleClose = () => {
    setShowWarning(false);
    resetActivityTimer();
  };

  return (
    <ActivityContext.Provider value={resetActivityTimer}>
      <InactivityWarning
        isOpen={showWarning}
        onContinue={resetActivityTimer}
        onClose={handleClose}
        remainingTime={remainingTime}
      />
      {children}
    </ActivityContext.Provider>
  );
};

export default ActivityMonitor;

import { useState, useEffect, useCallback, useRef, createContext } from "react";
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
  const [isPaused, setIsPaused] = useState(false);

  // Timer refs to avoid setInterval throttling in background tabs
  const warningTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

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
        // If another tab already flagged inactivity, enforce logout immediately
        if (localStorage.getItem("sessionExpired") === "true") {
          setIsLoggedIn(false);
          removeTokens();
          redirectToLogin();
          return;
        }

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

  // Schedule timers for warning and auto-logout using setTimeout (reliable in background)
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    // Clear any existing timers
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // If activity is paused (e.g., a modal is open), do not schedule timers
    if (isPaused) {
      return () => {
        if (warningTimeoutRef.current) {
          clearTimeout(warningTimeoutRef.current);
        }
        if (logoutTimeoutRef.current) {
          clearTimeout(logoutTimeoutRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }

    const now = Date.now();
    const elapsed = now - lastActivity;
    const totalMs = inactivityTimeout * 1000;
    const warningAt = Math.max(0, totalMs - WARNING_DURATION - elapsed);
    const logoutAt = Math.max(0, totalMs - elapsed);

    // Schedule warning
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setIsInactive(true);

      // Start visible countdown every second only while dialog is shown
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      setRemainingTime(WARNING_DURATION);
      countdownIntervalRef.current = setInterval(() => {
        setRemainingTime((prev) => Math.max(0, prev - 1000));
      }, 1000);
    }, warningAt);

    // Schedule logout
    logoutTimeoutRef.current = setTimeout(() => {
      setShowWarning(false);
      setIsInactive(false);
      setIsLoggedIn(false);
      removeTokens();
      localStorage.setItem("sessionExpired", "true");
      redirectToLogin();
    }, logoutAt);

    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isLoggedIn, lastActivity, inactivityTimeout, setIsLoggedIn, isPaused]);

  // Visibility change: if tab becomes active, recompute timers immediately
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) {
        // Force re-scheduling by updating lastActivity with same value
        setLastActivity((prev) => prev);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

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

  // Expose pause control on the context function without breaking existing consumers
  resetActivityTimer.setActivityPaused = setIsPaused;

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

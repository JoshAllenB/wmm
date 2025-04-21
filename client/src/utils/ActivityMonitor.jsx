import { useState, useEffect, useCallback, createContext } from "react";
import { getAccessToken, removeTokens } from "./Token/tokenStorage";

const TOKEN_EXPIRATION = 10_000; // 10 seconds for countdown before logout

export const ActivityContext = createContext();

// Function to handle redirect to login (can be shared across components)
export const redirectToLogin = () => {
  // Store error message for login page
  localStorage.setItem(
    "errorMessage",
    "Your session has expired. Please log in again."
  );
  
  // If not already on the login page, redirect
  if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
    window.location.href = '/';
  }
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

  const resetActivityTimer = useCallback(() => {
    setLastActivity(Date.now());
    setIsInactive(false);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    const activityCheck = setInterval(() => {
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - lastActivity;
      if (timeSinceLastActivity > inactivityTimeout * 1000) {
        setIsInactive(true);
      }
    }, 1000);

    return () => {
      clearInterval(activityCheck);
    };
  }, [isLoggedIn, lastActivity, inactivityTimeout]);

  useEffect(() => {
    if (isInactive) {
      const countdown = setTimeout(() => {
        const token = getAccessToken();
        if (!token) {
          return;
        }
        const payload = JSON.parse(atob(token.split(".")[1]));
        const originalExpirationTime = payload.exp * 1000;
        const inactivityExpirationTime =
        Date.now() + inactivityTimeout * 1000;
        const expirationTime = Math.min(
          originalExpirationTime,
          inactivityExpirationTime
        );

        const countDownInterval = setInterval(() => {
          const remainingTime = Math.max(0, expirationTime - Date.now());

          if (remainingTime > 0) {
            return;
          }
          clearInterval(countDownInterval);
          setIsLoggedIn(false);
          removeTokens();
          redirectToLogin();
        }, 1000);

        return () => clearInterval(countDownInterval);
      }, TOKEN_EXPIRATION); // 10 seconds

      return () => clearTimeout(countdown);
    }
  }, [isInactive, setIsLoggedIn, setErrorMessage, inactivityTimeout]);

  useEffect(() => {
    const handleActivity = () => resetActivityTimer();

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keypress", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keypress", handleActivity);
    };
  }, [resetActivityTimer]);

  return (
    <ActivityContext.Provider value={resetActivityTimer}>
      {children}
    </ActivityContext.Provider>
  );
};

export default ActivityMonitor;

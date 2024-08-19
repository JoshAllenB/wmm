import { useState, useEffect } from "react";
import { ColorModeContext, useMode } from "./UI/Theme/theme.utils";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Topbar from "./UI/Topbar";
import Sidebar from "./UI/Sidebar/Sidebar";
import AllClient from "./UI/Sidebar/AllClient";
import LoginPage from "../utils/UserAuth/login";
import AdminPanel from "./UI/Sidebar/AdminPanel";
import Hrg from "./UI/Sidebar/Hrg";
import validateToken from "../utils/Token/validateToken";
import { syncTokens } from "../utils/Token/tokenStorage";
import ActivityMonitor from "../utils/ActivityMonitor";
import { SocketProvider } from "../utils/Websocket/websocket";
import Modal from "./modal";

export default function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [inactivityTimeout, setInactivityTimeout] = useState(300); // Initial timeout of 5 minutes

  const handleInactivity = (timeout) => {
    console.log(`Setting inactivity timeout to ${timeout} seconds`);
    setInactivityTimeout(timeout);
  };

  useEffect(() => {
    const checkAuth = async () => {
      syncTokens();
      const user = await validateToken();
      if (user) {
        setIsLoggedIn(true);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    // Retrieve error message from localStorage
    const storedErrorMessage = localStorage.getItem("errorMessage");
    if (storedErrorMessage) {
      setErrorMessage(storedErrorMessage);
      // Clear error message from localStorage after displaying
      localStorage.removeItem("errorMessage");
    }
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SocketProvider>
          <ActivityMonitor
            isLoggedIn={isLoggedIn}
            setIsLoggedIn={setIsLoggedIn}
            setErrorMessage={setErrorMessage}
            inactivityTimeout={inactivityTimeout} // Pass inactivityTimeout here
          >
            <BrowserRouter>
              <div className="app">
                {isLoggedIn && <Sidebar isSidebar={isSidebar} />}
                <div className="content">
                  {isLoggedIn && (
                    <Topbar
                      setIsSidebar={setIsSidebar}
                      setIsLoggedIn={setIsLoggedIn}
                      onInactivityTimeoutChange={handleInactivity}
                    />
                  )}
                  {errorMessage && (
                    <Modal
                      isOpen={!!errorMessage}
                      onClose={() => setErrorMessage("")}
                    >
                      <p className="text-red-500 m-5">{errorMessage}</p>
                    </Modal>
                  )}
                  <Routes>
                    <Route
                      path="/"
                      element={<LoginPage setIsLoggedIn={setIsLoggedIn} />}
                    />
                    <Route
                      path="/all-client"
                      element={
                        isLoggedIn ? <AllClient /> : <Navigate to="/" replace />
                      }
                    />
                    <Route
                      path="/hrg"
                      element={
                        isLoggedIn ? <Hrg /> : <Navigate to="/" replace />
                      }
                    />
                    <Route
                      path="/admin-panel"
                      element={
                        isLoggedIn ? (
                          <AdminPanel />
                        ) : (
                          <Navigate to="/" replace />
                        )
                      }
                    />
                  </Routes>
                </div>
              </div>
            </BrowserRouter>
          </ActivityMonitor>
        </SocketProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

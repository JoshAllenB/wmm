import { useState, useEffect } from "react";
import { ColorModeContext, useMode } from "./UI/Theme/theme.utils";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Topbar from "./UI/Topbar";
import Sidebar from "./UI/Sidebar/Sidebar";
import AllClient from "./UI/Sidebar/AllClient";
import LoginPage from "../utils/UserAuth/login";
import AdminPanel from "./UI/Sidebar/AdminPanel";
import validateToken from "../utils/validateToken";
import { syncTokens } from "../utils/tokenStorage";
import { SocketProvider } from "../utils/Websocket/websocket";

export default function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SocketProvider>
          <BrowserRouter>
            <div className="app">
              {isLoggedIn && <Sidebar isSidebar={isSidebar} />}
              <div className="content">
                {isLoggedIn && (
                  <Topbar
                    setIsSidebar={setIsSidebar}
                    setIsLoggedIn={setIsLoggedIn}
                  />
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
                    path="/admin-panel"
                    element={
                      isLoggedIn ? <AdminPanel /> : <Navigate to="/" replace />
                    }
                  />
                </Routes>
              </div>
            </div>
          </BrowserRouter>
        </SocketProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CssBaseline } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Topbar from "./UI/Topbar";
import Sidebar from "./UI/Sidebar/Sidebar";
import AllClient from "./UI/Sidebar/AllClient";
import LoginPage from "../utils/UserAuth/login";
import AdminPanel from "./UI/Sidebar/AdminPanel";
import SubClass from "./UI/Sidebar/SubClass";
import Hrg from "./UI/Sidebar/Hrg";
import Area from "./UI/Sidebar/Area";
import validateToken from "../utils/Token/validateToken";
import { syncTokens } from "../utils/Token/tokenStorage";
import ActivityMonitor from "../utils/ActivityMonitor";
import { SocketProvider } from "../utils/Websocket/SocketProvider";
import Modal from "./modal";
import { Toaster } from "../components/UI/ShadCN/toaster";
import { UserProvider } from "../utils/Hooks/userProvider.jsx";

const App = React.memo(() => {
  const [isSidebar, setIsSidebar] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [inactivityTimeout, setInactivityTimeout] = useState(300);
  const [userData, setUserData] = useState(null);

  const handleInactivity = useCallback((timeout) => {
    console.log(`Setting inactivity timeout to ${timeout} seconds`);
    setInactivityTimeout(timeout);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      syncTokens();
      const user = await validateToken();
      if (user) {
        setIsLoggedIn(true);
        setUserData(user);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const storedErrorMessage = localStorage.getItem("errorMessage");
    if (storedErrorMessage) {
      setErrorMessage(storedErrorMessage);
      localStorage.removeItem("errorMessage");
    }
  }, []);

  const memoizedRoutes = useMemo(
    () => (
      <Routes>
        <Route path="/" element={<LoginPage setIsLoggedIn={setIsLoggedIn} />} />
        <Route
          path="/all-client"
          element={isLoggedIn ? <AllClient /> : <Navigate to="/" replace />}
        />
        <Route
          path="/hrg"
          element={isLoggedIn ? <Hrg /> : <Navigate to="/" replace />}
        />
        <Route
          path="/admin-panel"
          element={isLoggedIn ? <AdminPanel /> : <Navigate to="/" replace />}
        />
        <Route
          path="/subclass"
          element={isLoggedIn ? <SubClass /> : <Navigate to="/" replace />}
        />
        <Route
          path="/area"
          element={isLoggedIn ? <Area /> : <Navigate to="/" replace />}
        />
      </Routes>
    ),
    [isLoggedIn]
  );

  const memoizedTopbar = useMemo(
    () =>
      isLoggedIn && (
        <Topbar
          setIsSidebar={setIsSidebar}
          setIsLoggedIn={setIsLoggedIn}
          onInactivityTimeoutChange={handleInactivity}
        />
      ),
    [isLoggedIn, handleInactivity]
  );

  const memoizedSidebar = useMemo(
    () => isLoggedIn && <Sidebar isSidebar={isSidebar} />,
    [isLoggedIn, isSidebar]
  );

  const memoizedErrorModal = useMemo(
    () =>
      errorMessage && (
        <Modal isOpen={!!errorMessage} onClose={() => setErrorMessage("")}>
          <p className="text-red-500 m-5">{errorMessage}</p>
        </Modal>
      ),
    [errorMessage]
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <CssBaseline />
      <SocketProvider>
        <ActivityMonitor
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
          setErrorMessage={setErrorMessage}
          inactivityTimeout={inactivityTimeout}
        >
          <BrowserRouter>
            <UserProvider initialUserData={userData}>
              <div className="app">
                {memoizedSidebar}
                <div className="content">
                  {memoizedTopbar}
                  {memoizedErrorModal}
                  {memoizedRoutes}
                </div>
              </div>
            </UserProvider>
          </BrowserRouter>
          <Toaster />
        </ActivityMonitor>
      </SocketProvider>
    </>
  );
});

App.displayName = "App";

export default App;

import { useState, useEffect, useMemo, useCallback } from "react";
import { CssBaseline } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./UI/Sidebar/Sidebar";
import AllClient from "./UI/Sidebar/AllClient";
import LoginPage from "../utils/UserAuth/login";
import AdminPanel from "./UI/Sidebar/AdminPanel";
import SubClass from "./UI/Sidebar/SubClass";
import Accounting from "./UI/Sidebar/Accounting";
import Donor from "./UI/Sidebar/Donor";
import Area from "./UI/Sidebar/Area";
import GroupManagement from "./CRUD/Group";
import DataExport from "../components/DataExport";
import validateToken from "../utils/Token/validateToken";
import { syncTokens } from "../utils/Token/tokenStorage";
import ActivityMonitor from "../utils/ActivityMonitor";
import { SocketProvider } from "../utils/Websocket/SocketProvider";
import Modal from "./modal";
import { Toaster } from "../components/UI/ShadCN/toaster";
import { UserProvider } from "../utils/Hooks/userProvider.jsx";

const App = () => {
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
    const isSessionExpired = localStorage.getItem("sessionExpired");

    if (storedErrorMessage) {
      // Only show error messages that are not related to inactivity timeout
      // Inactivity timeout messages should be handled by the login page
      if (!isSessionExpired || !storedErrorMessage.includes("inactivity")) {
        setErrorMessage(storedErrorMessage);
        localStorage.removeItem("errorMessage");
      }
    }
  }, []);

  const memoizedRoutes = useMemo(
    () => (
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={<LoginPage setIsLoggedIn={setIsLoggedIn} />}
        />
        <Route
          path="/all-client"
          element={
            isLoggedIn ? <AllClient /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/donor"
          element={isLoggedIn ? <Donor /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin-panel"
          element={
            isLoggedIn ? <AdminPanel /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/accounting"
          element={
            isLoggedIn ? <Accounting /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/subclass"
          element={isLoggedIn ? <SubClass /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/area"
          element={isLoggedIn ? <Area /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/group"
          element={
            isLoggedIn ? <GroupManagement /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/data-export"
          element={
            isLoggedIn ? <DataExport /> : <Navigate to="/login" replace />
          }
        />
      </Routes>
    ),
    [isLoggedIn]
  );

  const memoizedSidebar = useMemo(
    () =>
      isLoggedIn && (
        <Sidebar
          isSidebar={isSidebar}
          setIsLoggedIn={setIsLoggedIn}
          onInactivityTimeoutChange={handleInactivity}
        />
      ),
    [isLoggedIn, isSidebar, handleInactivity]
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
      <UserProvider initialUserData={userData}>
        <SocketProvider>
          <ActivityMonitor
            isLoggedIn={isLoggedIn}
            setIsLoggedIn={setIsLoggedIn}
            setErrorMessage={setErrorMessage}
            inactivityTimeout={inactivityTimeout}
          >
            <BrowserRouter>
              <div className="app">
                {memoizedSidebar}
                <div className="content">
                  {memoizedErrorModal}
                  {memoizedRoutes}
                </div>
              </div>
            </BrowserRouter>
            <Toaster />
          </ActivityMonitor>
        </SocketProvider>
      </UserProvider>
    </>
  );
};

export default App;

import React, { Suspense } from "react";
import RegisterPage from "./signup";
import LoginPage from "./login";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const LazyDashboard = React.lazy(() => import("./dashboard"));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <LazyDashboard />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

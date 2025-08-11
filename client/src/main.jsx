import React from "react";
import ReactDOM from "react-dom/client";
import App from "./components/app.jsx";
import "../src/styles/main.css";
import setupGlobalAxiosInterceptor from "./services/globalAxiosInterceptor";

// Setup global axios interceptor for error handling
setupGlobalAxiosInterceptor();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <div
      id="root"
      className="min-h-screen min-w-screen flex flex-col justify-center items-center"
    >
      <App />
    </div>
  </React.StrictMode>
);

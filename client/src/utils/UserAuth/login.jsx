import axios from "axios";
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/UI/ShadCN/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/UI/ShadCN/tabs";
import RegisterPage from "./register";
import setAuthToken from "../Token/setAuthToken";
import validateToken from "../Token/validateToken";
import { setTokens } from "../Token/tokenStorage";
import { ActivityContext } from "../ActivityMonitor";
import { useApiResponseToast } from "../../components/UI/apiResponse";
import { useUser } from "../Hooks/userProvider";
import { webSocketService } from "../../services/WebSocketService";
import { v4 as uuidv4 } from "uuid";
import errorHandler from "../../services/errorHandler";

const LoginPage = ({ setIsLoggedIn }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("account");
  const { setUserData } = useUser();
  const navigate = useNavigate();
  const resetActivityTimer = useContext(ActivityContext);
  const handleApiResponse = useApiResponseToast();

  useEffect(() => {
    const checkAuth = async () => {
      const user = await validateToken();
      if (user) {
        setIsLoggedIn(true);
        setUserData(user);
        navigate("/all-client");
      } else {
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, [navigate, setIsLoggedIn, setUserData]);

  // Check for stored error messages (e.g. from 401 redirects)
  useEffect(() => {
    // Clear any session expiration messages on initial page load
    const isFirstLoad = sessionStorage.getItem("initialLoginLoad") !== "true";
    if (isFirstLoad) {
      localStorage.removeItem("errorMessage");
      localStorage.removeItem("sessionExpired");
      sessionStorage.setItem("initialLoginLoad", "true");
      return;
    }
    
    const storedErrorMessage = localStorage.getItem("errorMessage");
    const isSessionExpired = localStorage.getItem("sessionExpired");
    
    if (storedErrorMessage) {
      // Only show the session expired message if the flag is set
      if (isSessionExpired === "true") {
        setErrorMessage("Your session has expired. Please log in again.");
      } else {
        setErrorMessage(storedErrorMessage);
      }
      
      // Clean up storage
      localStorage.removeItem("errorMessage");
      localStorage.removeItem("sessionExpired");
    }
  }, []);

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    // Clear error when user starts typing
    if (errorMessage) setErrorMessage("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (errorMessage) setErrorMessage("");
  };

  const handleTabChange = (value) => setActiveTab(value);
  const handleRegisterSuccess = () => {
    setTimeout(() => setActiveTab("account"), 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/auth/login`,
        {
          username,
          password,
        }
      );

      const { token, refreshToken, user } = response.data;

      // Store session information for WebSocket
      if (!localStorage.getItem("sessionId")) {
        localStorage.setItem("sessionId", uuidv4());
      }
      
      // Store user information for WebSocket reconnection
      localStorage.setItem("userId", user.id);
      localStorage.setItem("username", user.username);

      setTokens(token, refreshToken);
      setAuthToken(token);
      setIsLoggedIn(true);
      setUserData(user);
      resetActivityTimer();

      // After setting the user data, connect to WebSocket
      webSocketService.connect({
        query: {
          userId: user.id,
          username: user.username,
          sessionId: localStorage.getItem("sessionId")
        }
      });
      
      navigate("/all-client");
    } catch (error) {
      console.error("Error in login request:", error);
      setIsLoading(false);

      if (error.response) {
        console.error("Error response from server:", error.response.data);

        // Display specific error messages from the backend
        if (
          error.response.data.error === "Account locked" &&
          error.response.data.message
        ) {
          // Display account lockout message with time remaining
          setErrorMessage(error.response.data.message);
        } else if (error.response.data.error === "Invalid credentials") {
          setErrorMessage("Incorrect username or password.");
        } else if (error.response.data.error === "User already logged in") {
          setErrorMessage("You are already logged in on another device.");
        } else {
          setErrorMessage(
            error.response.data.message ||
              error.response.data.error ||
              "An error occurred. Please try again."
          );
        }
      } else if (error.request) {
        // Handle network errors
        setErrorMessage(
          "Unable to connect to the server. Please check your network connection and try again."
        );
      } else {
        setErrorMessage(
          "An unexpected error occurred. Please try again later."
        );
      }

      // Use centralized error handler for login errors (but don't logout)
      errorHandler.handleAxiosError(error, { shouldLogout: false, shouldClearCache: true });
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center items-center">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-[500px] h-[500px] rounded-md border-2"
      >
        <TabsList className="flex gap-[80px] p-7 rounded-md">
          <TabsTrigger
            value="account"
            className="font-roboto text-xl py-1 rounded-md"
            onClick={() => handleTabChange("account")}
          >
            Login
          </TabsTrigger>
          <TabsTrigger
            value="register"
            className="font-roboto text-xl py-1 rounded-md"
            onClick={() => handleTabChange("register")}
          >
            Register
          </TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="m-10 ">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="username">
              <label className="block text-lg font-medium leading-6 ">
                Username:
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  value={username}
                  autoComplete={username}
                  onChange={handleUsernameChange}
                  className={`block w-full rounded-md border-0 text-lg py-1.5 shadow-sm ${
                    errorMessage
                      ? "ring-2 ring-red-500"
                      : "ring-2 ring-gray-300"
                  } placeholder:text-gray-300 focus:ring-3 p-3`}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="password">
              <label className="block text-lg font-medium leading-6">
                Password:
              </label>
              <div className="mt-2">
                <input
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`block w-full rounded-md border-0 text-lg py-1.5 shadow-sm ${
                    errorMessage
                      ? "ring-2 ring-red-500"
                      : "ring-2 ring-gray-300"
                  } placeholder:text-gray-300 focus:ring-3 p-3`}
                  disabled={isLoading}
                />
              </div>
            </div>
            {errorMessage && (
              <div className="text-red-500 p-2 bg-red-50 border border-red-200 rounded-md">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              className="w-[100px] h-[40px] bg-blue-600 hover:bg-blue-800 border text-white text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading
                </span>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="register">
          <RegisterPage onSuccess={handleRegisterSuccess} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoginPage;

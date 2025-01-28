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

const LoginPage = ({ setIsLoggedIn }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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

  const handleUsernameChange = (e) => setUsername(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);
  const handleTabChange = (value) => setActiveTab(value);
  const handleRegisterSuccess = () => {
    setTimeout(() => setActiveTab("account"), 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/auth/login`,
        {
          username,
          password,
        }
      );
      handleApiResponse(result.data);

      if (result.data.token) {
        setTokens(result.data.token, result.data.refreshToken);
        setAuthToken(result.data.token);

        const userData = result.data.user;
        setUserData(userData);
        setIsLoggedIn(true);
        navigate("/all-client");

        // Generate a session ID
        const sessionId = uuidv4();
        localStorage.setItem("sessionId", sessionId);

        // Connect to WebSocket with session ID and user data
        webSocketService.connect({
          query: {
            userId: userData.id,
            username: userData.username,
            sessionId: sessionId,
          },
        });

        resetActivityTimer();
      } else {
        setErrorMessage(
          result.data.error || "An error occurred. Please try again later."
        );
      }
    } catch (err) {
      console.error("Error in login request:", err);
      if (err.response) {
        console.error("Error response from server:", err.response.data);
        if (err.response.status === 401) {
          setErrorMessage("Incorrect username or password.");
        } else {
          setErrorMessage(
            `An error occurred: ${err.response.data.message || "Unknown error"}`
          );
        }
      } else {
        setErrorMessage("An error occurred. Please try again later.");
      }
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center items-center">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-[400px] h-[400px] rounded-md border-2"
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
                  className="block w-full rounded-md border-0 text-lg py-1.5 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
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
                  className="block w-full rounded-md border-0 text-lg py-1.5 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
                />
              </div>
            </div>
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}

            <Button
              type="submit"
              className="w-[100px] h-[40px] bg-blue-600 hover:bg-blue-800 border text-white text-lg "
            >
              Login
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

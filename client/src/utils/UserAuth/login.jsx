import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/UI/ShadCN/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/UI/ShadCN/tabs";
import RegisterPage from "./register";
import setAuthToken from "../setAuthToken";
import validateToken from "../validateToken";
import io from "socket.io-client";
import { setTokens } from "../tokenStorage";

const socket = io("http://localhost:3001");

const LoginPage = ({ setIsLoggedIn }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("account");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const user = await validateToken();
      if (user) {
        setIsLoggedIn(true);
        navigate("/all-client");
      }
    };

    checkAuth();
  }, [navigate, setIsLoggedIn]);

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const handleRegisterSuccess = () => {
    setTimeout(() => {
      setActiveTab("account");
    }, 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await axios.post("http://localhost:3001/auth/login", {
        username,
        password,
      });

      if (result.data.token) {
        setTokens(result.data.token);
        setAuthToken(result.data.token);

        setIsLoggedIn(true);

        navigate("/all-client");
        socket.emit("user_status_change", {
          userId: result.data.user._id,
          status: "Active",
        });
      } else {
        setErrorMessage(result.data.error);
      }
    } catch (err) {
      console.error("error:", err);
      if (err.response && err.response.status === 401) {
        console.error(err);
        setErrorMessage("Incorrect Password");
      } else {
        console.error(err);
        setErrorMessage("An error occurred. Please try again later.");
      }
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center items-center ">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-[400px] h-[400px] bg-white-700 rounded-md bg-clip-padding backdrop-filter backdrop-blur-lg bg-opacity-60 border border-gray-100 "
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
            className="font-roboto text-xl  py-1 rounded-md"
            onClick={() => handleTabChange("register")}
          >
            Register
          </TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="m-10 ">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="username">
              <label className="block text-sm font-medium leading-6 text-gray-200">
                Username:
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  value={username}
                  autoComplete={username}
                  onChange={handleUsernameChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
                />
              </div>
            </div>
            <div className="password">
              <label className="block text-sm font-medium leading-6 text-gray-200">
                Password:
              </label>
              <div className="mt-2">
                <input
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
                />
              </div>
            </div>
            <Button type="submit" className="bg-gray-700 border">
              Login
            </Button>
            {errorMessage && (
              <div className="error-message">{errorMessage}</div>
            )}
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

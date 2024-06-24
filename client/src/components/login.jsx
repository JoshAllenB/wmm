import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./UI/ShadCN/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./UI/ShadCN/tabs";
import RegisterPage from "./register";
import setAuthToken from "../utils/setAuthToken";
import io from "socket.io-client";

const socket = io("http://localhost:3001");

const LoginPage = ({ setIsLoggedIn }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await axios.post("http://localhost:3001/auth/login", {
        username,
        password,
      });

      if (result.data.token) {
        localStorage.setItem("token", result.data.token);
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
    <div className="flex min-h-full  flex-1 flex-col justify-center items-center ">
      <Tabs defaultValue="account" className="w-[350px] h-[300px]">
        <TabsList className="flex gap-[80px] ">
          <TabsTrigger value="account" className="font-roboto text-xl">
            Login
          </TabsTrigger>
          <TabsTrigger value="register" className="font-roboto text-xl">
            Register
          </TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="mt-2">
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
          <RegisterPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoginPage;

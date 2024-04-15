import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/userAuth.css";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RegisterPage from "./signup";

const LoginPage = () => {
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
      const result = await axios.post("http://localhost:3001/login", {
        username,
        password,
      });

      if (result.data === "success") {
        navigate("/dashboard");
      } else {
        setErrorMessage(result.data);
      }

      console.log(result);
    } catch (err) {
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
    <Tabs
      defaultValue="account"
      className="flex min-h-full flex-1 flex-col justify-center "
    >
      <TabsList className="sm:mx-auto sm:w-full sm:max-w-sm space-x-3">
        <TabsTrigger value="account">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="username">
            <label className="block text-sm font-medium leading-6 text-gray-600">
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
            <label className="block text-sm font-medium leading-6 text-gray-600">
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
          <Button type="submit">Login</Button>
          {errorMessage && <div className="error-message">{errorMessage}</div>}
        </form>
      </TabsContent>
      <TabsContent value="register">
        <RegisterPage /> {/* Render the RegisterPage component */}
      </TabsContent>
    </Tabs>
  );
};

export default LoginPage;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Tabs, TabsContent } from "./UI/ShadCN/tabs";
import { Button } from "./UI/ShadCN/button";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match, please try again!");
      return;
    }

    try {
      const result = await axios.post("http://localhost:3001/auth/register", {
        username,
        password,
      });

      navigate("/");

      console.log(result);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Tabs
      defaultValue="account"
      className="flex min-h-full  flex-1 flex-col justify-center items-center "
    >
      <TabsContent value="account">
        <form onSubmit={handleSubmit} className="space-y-3 w-[350px]">
          <label className="block text-sm font-medium leading-6 text-gray-200">
            Username:
          </label>
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
          />
          <label className="block text-sm font-medium leading-6 text-gray-200">
            Password:
          </label>
          <input
            type="password"
            value={password}
            onChange={handlePasswordChange}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
          />
          <label className="block text-sm font-medium leading-6 text-gray-200">
            Confirm Password:
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
          />
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          <Button type="submit" className="bg-gray-700 border">
            Register
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
};

export default RegisterPage;

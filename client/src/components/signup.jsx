import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import bcrypt from "bcryptjs";
import { Tabs } from "@/components/ui/tabs";
import "../styles/userAuth.css";
import { Button } from "./ui/button";

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
      const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
      const result = await axios.post("http://localhost:3001/register", {
        username,
        password: hashedPassword, // Send hashed password to the server
      });

      navigate("/login");

      console.log(result);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Tabs defaultValue="account" className="w-[400px]">
      <form onSubmit={handleSubmit}>
        <div className="username">
          <label>Username:</label>
          <input type="text" value={username} onChange={handleUsernameChange} />
        </div>
        <div className="password">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={handlePasswordChange}
          />
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input
            type="password"
            id="confirm-password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
          />
        </div>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <Button type="submit">Register</Button>
      </form>
    </Tabs>
    // < className="register-container">
    //   <h2>Register</h2>
  );
};

export default RegisterPage;

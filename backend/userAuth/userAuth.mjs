import express from "express";
import loginUser from "./login.mjs";
import registerUser from "./register.mjs";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const loginResult = await loginUser(username, password);

  if (loginResult.error) {
    console.error("Login error:", loginResult.error);
    res.status(401).json(loginResult);
  } else {
    res.status(200).json(loginResult);
  }
});

router.post("/register", async (req, res) => {
  const registerResult = await registerUser(req.body);
  if (registerResult.error) {
    const statusCode = registerResult.error === "DuplicateUsernameError" ? 409 : 400;
    res.status(statusCode).json(registerResult);
  } else {
    res.status(200).json(registerResult);
  }
});

export default router;

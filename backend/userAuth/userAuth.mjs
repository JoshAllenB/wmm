import express from "express";
import loginUser from "./login.mjs";
import registerUser from "./register.mjs";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const loginResult = await loginUser(username, password);
  res.status(loginResult.error ? 401 : 200).json(loginResult);
});

router.post("/register", async (req, res) => {
  const registerResult = await registerUser(req.body);
  if (registerResult.error) {
    let statusCode = 400;
    if (registerResult.error === "DuplicateUsernameError") {
      statusCode = 409; // Conflict
    }
    res.status(statusCode).json(registerResult);
  } else {
    res.status(200).json(registerResult);
  }
});

export default router;

import express from "express";
import dotenv from "dotenv";
import { getAllPayments } from "./logic.mjs";

dotenv.config();

const router = express.Router();

router.get("/payments", getAllPayments);

export default router;

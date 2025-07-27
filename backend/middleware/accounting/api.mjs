import express from "express";
import dotenv from "dotenv";
import { getAllPayments, getAllPaymentsUnpaginated } from "./logic.mjs";

dotenv.config();

const router = express.Router();

// In your routes file (router.js)
router.get("/payments", (req, res) => {
  getAllPayments(req, res);
});

router.get("/payments/all", (req, res) => {
  getAllPaymentsUnpaginated(req, res);
});

export default router;

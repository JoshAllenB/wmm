import express from "express";
import { verifyToken } from "../userAuth/verifyToken.mjs";
import {
  createQueue,
  getQueue,
  enqueueSelection,
  enqueueByFilter,
  listQueues,
  clearQueue,
  checkPrintHistory,
} from "../utils/print-queue-service.mjs";

const router = express.Router();

router.post("/print-queues", verifyToken, async (req, res) => {
  try {
    const { name, visibility, actionType, templateRefId, ttlDays, department } =
      req.body;
    const queue = await createQueue({
      name,
      ownerUserId:
        req.user?.id || req.user?._id || req.user?.username || "unknown",
      department: department || req.user?.department,
      visibility,
      actionType,
      templateRefId,
      ttlDays,
    });
    res.status(201).json(queue);
  } catch (e) {
    console.error("createQueue error", e);
    res.status(500).json({ error: "Failed to create queue" });
  }
});

router.get("/print-queues", verifyToken, async (req, res) => {
  try {
    const queues = await listQueues({
      ownerUserId:
        req.user?.id || req.user?._id || req.user?.username || "unknown",
      department: req.user?.department,
    });
    res.json(queues);
  } catch (e) {
    console.error("listQueues error", e);
    res.status(500).json({ error: "Failed to list queues" });
  }
});

router.get("/print-queues/:queueId", verifyToken, async (req, res) => {
  try {
    const queue = await getQueue(req.params.queueId);
    if (!queue) return res.status(404).json({ error: "Queue not found" });
    res.json(queue);
  } catch (e) {
    console.error("getQueue error", e);
    res.status(500).json({ error: "Failed to get queue" });
  }
});

router.post(
  "/print-queues/:queueId/enqueue/selection",
  verifyToken,
  async (req, res) => {
    try {
      const { clientIds } = req.body;
      const result = await enqueueSelection({
        queueId: req.params.queueId,
        clientIds: Array.isArray(clientIds) ? clientIds : [],
        userId:
          req.user?.id || req.user?._id || req.user?.username || "unknown",
      });
      res.json(result);
    } catch (e) {
      console.error("enqueueSelection error", e);
      res.status(500).json({ error: "Failed to enqueue selection" });
    }
  }
);

router.post(
  "/print-queues/:queueId/enqueue/filter",
  verifyToken,
  async (req, res) => {
    try {
      const result = await enqueueByFilter({
        queueId: req.params.queueId,
        filterPayload: req.body,
        userId:
          req.user?.id || req.user?._id || req.user?.username || "unknown",
      });
      res.json(result);
    } catch (e) {
      console.error("enqueueByFilter error", e);
      res.status(500).json({ error: "Failed to enqueue by filter" });
    }
  }
);

router.post("/print-queues/:queueId/clear", verifyToken, async (req, res) => {
  try {
    const result = await clearQueue(req.params.queueId);
    res.json(result);
  } catch (e) {
    console.error("clearQueue error", e);
    res.status(500).json({ error: "Failed to clear queue" });
  }
});

router.post("/print-queues/check-history", verifyToken, async (req, res) => {
  try {
    const { clientIds } = req.body;
    const result = await checkPrintHistory(clientIds || []);
    res.json(result);
  } catch (e) {
    console.error("checkPrintHistory error", e);
    res.status(500).json({ error: "Failed to check print history" });
  }
});

export default router;

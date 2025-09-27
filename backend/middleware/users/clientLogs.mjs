import express from "express";
import { verifyToken } from "../../userAuth/verifyToken.mjs";
import { checkRole } from "./checkRole.mjs";
import { getClientLogs } from "../clientLogs/clientLogs.mjs";
import LogModel from "../../models/userControl/LogSchema.mjs";
import UserModel from "../../models/userControl/users.mjs";

const router = express.Router();

// Get logs for a specific client
router.get("/:id", verifyToken, checkRole(["Admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await getClientLogs(parseInt(id));

    // Populate user information for each log
    const logsWithUserInfo = await Promise.all(
      logs.map(async (log) => {
        try {
          const user = await UserModel.findById(log.userId)
            .select("username email")
            .lean();
          return {
            ...log,
            userInfo: user
              ? {
                  username: user.username,
                  email: user.email,
                }
              : null,
          };
        } catch (error) {
          console.error(`Error fetching user info for log ${log._id}:`, error);
          return log;
        }
      })
    );

    res.json(logsWithUserInfo);
  } catch (error) {
    console.error("Error fetching client logs:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

// Get all logs (admin only)
router.get("/", verifyToken, checkRole(["Admin"]), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      clientId,
      action,
      startDate,
      endDate,
      userId,
    } = req.query;

    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));

    // Build query
    const query = {};

    if (clientId) {
      query.clientId = parseInt(clientId);
    }

    if (action && action !== "all") {
      // Only add action to query if it's not 'all'
      query.action = action;
    }

    if (userId && userId !== "all") {
      // Only add userId to query if it's not 'all'
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      // Normalize startDate to start of day if provided
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start)) {
          // If only a date part is provided, ensure we include the whole day
          start.setHours(0, 0, 0, 0);
          query.timestamp.$gte = start;
        }
      }
      // Normalize endDate to end of day if provided
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end)) {
          // Include the entire end day
          end.setHours(23, 59, 59, 999);
          query.timestamp.$lte = end;
        }
      }
      // If both exist and are inverted, swap to be safe
      if (
        query.timestamp.$gte &&
        query.timestamp.$lte &&
        query.timestamp.$gte > query.timestamp.$lte
      ) {
        const tmp = query.timestamp.$gte;
        query.timestamp.$gte = query.timestamp.$lte;
        query.timestamp.$lte = tmp;
      }
    }

    // Get total count for pagination
    const total = await LogModel.countDocuments(query);

    // Calculate skip value for pagination
    const skip = (validatedPage - 1) * validatedLimit;

    // Get logs with pagination
    const logs = await LogModel.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(validatedLimit)
      .lean();

    // Populate user information
    const logsWithUserInfo = await Promise.all(
      logs.map(async (log) => {
        try {
          const user = await UserModel.findById(log.userId)
            .select("username email")
            .lean();
          return {
            ...log,
            userInfo: user
              ? {
                  username: user.username,
                  email: user.email,
                }
              : null,
          };
        } catch (error) {
          console.error(`Error fetching user info for log ${log._id}:`, error);
          return log;
        }
      })
    );

    res.json({
      logs: logsWithUserInfo,
      pagination: {
        total,
        page: validatedPage,
        pages: Math.ceil(total / validatedLimit),
        limit: validatedLimit,
      },
    });
  } catch (error) {
    console.error("Error fetching all logs:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

export default router;

import express from 'express';
import { verifyToken } from '../../userAuth/verifyToken.mjs';
import { checkRole } from './checkRole.mjs';
import { getClientLogs } from '../clientLogs/clientLogs.mjs';
import LogModel from '../../models/userControl/LogSchema.mjs';
import UserModel from '../../models/userControl/users.mjs';

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
          const user = await UserModel.findById(log.userId).select('username email').lean();
          return {
            ...log,
            userInfo: user ? {
              username: user.username,
              email: user.email
            } : null
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
      message: error.message 
    });
  }
});

// Get all logs (admin only)
router.get("/", verifyToken, checkRole(["Admin"]), async (req, res) => {
  try {
    console.log("Getting all logs");
    const { page = 1, limit = 50, clientId, action, startDate, endDate } = req.query;
    console.log("Query parameters:", { page, limit, clientId, action, startDate, endDate });
    
    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.max(1, Math.min(100, parseInt(limit) || 50));
    console.log("Validated pagination:", { validatedPage, validatedLimit });
    
    // Build query
    const query = {};
    
    if (clientId) {
      query.clientId = parseInt(clientId);
    }
    
    if (action && action !== 'all') {  // Only add action to query if it's not 'all'
      query.action = action;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    console.log("MongoDB query:", JSON.stringify(query, null, 2));
    
    // Get total count for pagination
    const total = await LogModel.countDocuments(query);
    console.log("Total documents found:", total);
    
    // Calculate skip value for pagination
    const skip = (validatedPage - 1) * validatedLimit;
    console.log("Skip value:", skip);
    
    // Get logs with pagination
    const logs = await LogModel.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(validatedLimit)
      .lean();
    
    console.log("Logs found:", logs.length);
    
    // Populate user information
    const logsWithUserInfo = await Promise.all(
      logs.map(async (log) => {
        try {
          const user = await UserModel.findById(log.userId).select('username email').lean();
          return {
            ...log,
            userInfo: user ? {
              username: user.username,
              email: user.email
            } : null
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
        limit: validatedLimit
      }
    });
  } catch (error) {
    console.error("Error fetching all logs:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: error.message 
    });
  }
});

export default router; 
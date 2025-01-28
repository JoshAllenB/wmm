// middleware/attachSocketId.js
const attachSocketId = (req, res, next) => {
  const userId = req.userId; // Assuming userId is available in the request

  if (!userId) {
    console.warn("No userId found in request");
    return next();
  }

  if (global.socketIdMap && global.socketIdMap.has(userId)) {
    req.socketId = global.socketIdMap.get(userId);
    req.io = global.io;
    console.log(`Attached socketId ${req.socketId} for user ${userId}`);
  } else {
    console.warn(`No Socket connection found for user ${userId}`);
  }

  next();
};

export default attachSocketId;

import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No Token Provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Unauthorized: Invalid Token" });
    }

    if (!decoded.userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Invalid Token Payload" });
    }

    req.userId = decoded.userId;
    next();
  });
};

export default verifyToken;

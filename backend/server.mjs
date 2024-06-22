import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import userAuthRouter from "./userAuth/userAuth.mjs";
import initWebSocket from "./websocket.mjs"; // New import for WebSocket logic

import userRoutes from "./middleware/users/Users.mjs";
import clientsRoutes from "./middleware/wmm/Clients.mjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // Allow your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  "/auth",
  (req, res, next) => {
    req.io = io;
    next();
  },
  userAuthRouter
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allow your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

mongoose.set("debug", true);

initWebSocket(io);

app.use(
  "/users",
  (req, res, next) => {
    req.io = io;
    next();
  },
  userRoutes
);

app.use(
  "/clients",
  (req, res, next) => {
    req.io = io;
    next();
  },
  clientsRoutes
);

// app.get("/address/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const client = await ClientModel.findById(id);

//     if (!client) {
//       return res.status(404).json({ error: "Client not found" });
//     }

//     res.json({ address: client.address });
//   } catch (error) {
//     console.error("Error fetching address:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// app.get("/search", async (req, res) => {
//   const { query: searchQuery } = req.query;

//   try {
//     const id = parseInt(searchQuery);
//     if (isNaN(id)) {
//       const clients = await ClientModel.find(
//         { $text: { $search: searchQuery } },
//         { score: { $meta: "textScore" } }
//       )
//         .sort({ score: { $meta: "textScore" } })
//         .limit(20);

//       res.json(clients);
//     } else {
//       const client = await ClientModel.findOne({ id });
//       if (client) {
//         res.json([client]);
//       } else {
//         res.json([]);
//       }
//     }
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
const IP = "0.0.0.0";

server.listen(PORT, IP, () => {
  console.log(`Server is running on http://${IP}:${PORT}`);
});

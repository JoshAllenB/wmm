import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import userAuthRouter from "./userAuth/userAuth.mjs";
import initWebSocket from "./websocket.mjs";
import userRoutes from "./middleware/users/Users.mjs";
import clientsRoutes from "./middleware/clients/Clients.mjs";
import hrgRoutes from "./middleware/hrg/Hrg.mjs";
import wmmRoutes from "./middleware/wmm/wmm.mjs";
import promoRoutes from "./middleware/promo/promo.mjs";
import complimentaryRoutes from "./middleware/complimentary/complimentary.mjs";
import fomRoutes from "./middleware/fom/fom.mjs";
import calRoutes from "./middleware/cal/cal.mjs";
import roleRoutes from "./middleware/users/roleManagement.mjs";
import utilRoutes from "./middleware/fetchUtils.mjs";
import dataExportRoutes from "./middleware/dataExport/dataExport.mjs";
import clientLogsRoutes from "./middleware/users/clientLogs.mjs";
import accountingRoutes from "./middleware/accounting/api.mjs";
import donorRoute from "./middleware/donorData/api.mjs";
import printQueueRoutes from "./middleware/printQueue.mjs";
import backupRoutes from "./middleware/backup/backup.mjs";
import { initializeBackupService } from "./utils/database-backup.mjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load build version info
const versionFilePath = path.join(__dirname, "./version.json");
let buildInfo = { version: "dev", builtAt: new Date().toISOString(), commit: "dev" };
try {
  const raw = fs.readFileSync(versionFilePath, "utf-8");
  buildInfo = JSON.parse(raw);
} catch (e) {
  console.warn("Version file not found or invalid, using fallback build info.");
}
const buildVersion = buildInfo.version;

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      `http://${process.env.IP_ADDRESS}:5173`,
      `http://${process.env.IP_ADDRESS}:3001`,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      `http://${process.env.IP_ADDRESS}:5173`,
      `http://${process.env.IP_ADDRESS}:3001`,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

mongoose.set("debug", false);

initWebSocket(io);

// Build notification helper
function notifyClientsOfNewBuild() {
  try {
    // Reload version info from disk in case it changed
    const raw = fs.readFileSync(versionFilePath, "utf-8");
    buildInfo = JSON.parse(raw);
  } catch (e) {
    // Keep previous buildInfo on error
  }
  io.emit("new-build-available", {
    version: buildInfo.version,
    builtAt: buildInfo.builtAt,
    commit: buildInfo.commit,
    timestamp: Date.now(),
  });
  console.log(`Notified ${io.engine.clientsCount} clients of new build ${buildInfo.version}`);
}

const attachIO = (req, res, next) => {
  req.io = io;
  next();
};

console.log("IP Address:", process.env.IP_ADDRESS);

app.use("/util", attachIO, utilRoutes);
app.use("/util", attachIO, printQueueRoutes);
app.use("/auth", attachIO, userAuthRouter);
app.use("/users", attachIO, userRoutes);
app.use("/clients", attachIO, clientsRoutes);
app.use("/hrg", attachIO, hrgRoutes);
app.use("/wmm", attachIO, wmmRoutes);
app.use("/promo", attachIO, promoRoutes);
app.use("/complimentary", attachIO, complimentaryRoutes);
app.use("/fom", attachIO, fomRoutes);
app.use("/cal", attachIO, calRoutes);
app.use("/roles", attachIO, roleRoutes);
app.use("/data-export", attachIO, dataExportRoutes);
app.use("/client-logs", attachIO, clientLogsRoutes);
app.use("/accounting", attachIO, accountingRoutes);
app.use("/donor-data", attachIO, donorRoute);
app.use("/api/backup", attachIO, backupRoutes);

app.use(
  express.static(path.join(__dirname, "../client/dist"), {
    // Different cache strategies for different file types
    setHeaders: (res, filePath) => {
      const isStaticAsset =
        /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(filePath);
      const isHtml = /\.html?$/.test(filePath);

      if (isStaticAsset) {
        // Cache hashed assets for 1 year (immutable)
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (isHtml) {
        // Never cache HTML
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else {
        // Default cache for other files
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
      res.setHeader("X-Build-Version", buildVersion);
    },
  })
);

// Expose build info for clients and CI
app.get("/api/build", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({ ...buildInfo, serverTime: new Date().toISOString() });
});

// Endpoint to notify clients of new build (hook this into your deploy pipeline)
app.post("/api/notify-build", (req, res) => {
  notifyClientsOfNewBuild();
  res.json({ success: true, clientsNotified: io.engine.clientsCount, version: buildInfo.version });
});

app.get("/*", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("X-Build-Version", buildVersion); // Optional: for debugging
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

const PORT = process.env.SERVER_PORT;
const IP = process.env.SERVER_IP;

// Initialize backup service
initializeBackupService();

server.listen(PORT, IP, () => {
  console.log(`Server is running on http://${IP}:${PORT}`);
  console.log(`Database backup service initialized`);
});

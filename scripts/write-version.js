import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Paths - adapted for monorepo structure
const versionFile = path.resolve("./client/public/version.json"); // frontend
const backendFile = path.resolve("./backend/version.json"); // backend

// Get values from client package.json (frontend version)
const pkg = JSON.parse(fs.readFileSync("./client/package.json", "utf-8"));
const commit = execSync("git rev-parse --short HEAD").toString().trim();
const builtAt = new Date().toISOString();

const versionData = {
  version: pkg.version,
  commit,
  builtAt,
};

// Write to frontend (client/public/) and backend root
fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
fs.writeFileSync(backendFile, JSON.stringify(versionData, null, 2));

console.log("✅ Version file generated:", versionData);

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Paths - adapted for monorepo structure
const versionFile = path.resolve(projectRoot, "client/public/version.json"); // frontend
const backendFile = path.resolve(projectRoot, "backend/version.json"); // backend

// Get values from client package.json (frontend version)
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(projectRoot, "client/package.json"), "utf-8")
);
const commit = execSync("git rev-parse --short HEAD").toString().trim();
const commitCount = execSync("git rev-list --count HEAD").toString().trim();
const builtAt = new Date().toISOString();

// Parse current version
const [major, minor, patch] = pkg.version.split(".").map(Number);

// Get commit messages since last tag to determine version bump
let versionBump = "patch"; // default to patch
try {
  const lastTag = execSync(
    "git describe --tags --abbrev=0 2>/dev/null || echo 'v0.0.0'"
  )
    .toString()
    .trim();
  const commitsSinceTag = execSync(`git log ${lastTag}..HEAD --oneline`)
    .toString()
    .trim();

  if (commitsSinceTag) {
    const commitLines = commitsSinceTag.split("\n");

    // Check for major version indicators
    const majorIndicators = [
      "BREAKING CHANGE",
      "BREAKING:",
      "major:",
      "feat!:",
      "feat(breaking)",
    ];
    const hasMajorChange = commitLines.some((line) =>
      majorIndicators.some((indicator) =>
        line.toLowerCase().includes(indicator.toLowerCase())
      )
    );

    // Check for minor version indicators
    const minorIndicators = ["feat:", "feature:", "new:", "add:", "minor:"];
    const hasMinorChange = commitLines.some((line) =>
      minorIndicators.some((indicator) =>
        line.toLowerCase().includes(indicator.toLowerCase())
      )
    );

    if (hasMajorChange) {
      versionBump = "major";
    } else if (hasMinorChange) {
      versionBump = "minor";
    }
  }
} catch (error) {
  console.log("Could not determine version bump from git history, using patch");
}

// Calculate new version
let newMajor = major;
let newMinor = minor;
let newPatch = patch;

switch (versionBump) {
  case "major":
    newMajor += 1;
    newMinor = 0;
    newPatch = 0;
    break;
  case "minor":
    newMinor += 1;
    newPatch = 0;
    break;
  case "patch":
  default:
    newPatch += 1;
    break;
}

const newVersion = `${newMajor}.${newMinor}.${newPatch}`;
const fullVersion = `${newVersion}.${commitCount}`;

const versionData = {
  version: fullVersion,
  baseVersion: newVersion,
  versionBump,
  commit,
  commitCount,
  builtAt,
};

// Write to frontend (client/public/) and backend root
fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
fs.writeFileSync(backendFile, JSON.stringify(versionData, null, 2));

console.log("✅ Version file generated:", versionData);

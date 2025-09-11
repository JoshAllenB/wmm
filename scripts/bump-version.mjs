import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const packageJsonPath = path.resolve(projectRoot, "client/package.json");

// Get current version
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);

// Get version bump type from command line argument
const bumpType = process.argv[2] || "patch";

let newMajor = major;
let newMinor = minor;
let newPatch = patch;

switch (bumpType) {
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

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(
  `✅ Version bumped from ${pkg.version} to ${newVersion} (${bumpType})`
);

// Run the version script to generate version files
execSync("node scripts/write-version.mjs", {
  cwd: projectRoot,
  stdio: "inherit",
});

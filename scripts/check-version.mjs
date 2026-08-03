import { readFileSync } from "node:fs";

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/u;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const packageVersion = readJson("package.json").version;
const jsrVersion = readJson("jsr.json").version;
const indexSource = readFileSync("src/index.ts", "utf8");
const revisionMatch = indexSource.match(/export const REVISION = "([^"]+)";/u);
const revisionVersion = revisionMatch?.[1];

const versions = [
  ["package.json", packageVersion],
  ["jsr.json", jsrVersion],
  ["src/index.ts REVISION", revisionVersion],
];

for (const [source, version] of versions) {
  if (!SEMVER_PATTERN.test(version ?? "")) {
    console.error(`${source} has invalid version: ${version ?? "missing"}`);
    process.exit(1);
  }
}

if (packageVersion !== jsrVersion || packageVersion !== revisionVersion) {
  console.error(
    `Version mismatch: package.json=${packageVersion} jsr.json=${jsrVersion} REVISION=${revisionVersion}`,
  );
  process.exit(1);
}

console.log(`Version consistent: ${packageVersion}`);

import { readFileSync, writeFileSync } from "node:fs";

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/u;
const VERSION_TARGETS = ["patch", "minor", "major"];

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, body) {
	writeFileSync(path, `${JSON.stringify(body, null, "\t")}\n`);
}

function parseSemver(version) {
	const match = version.match(SEMVER_PATTERN);
	if (!match) {
		throw new Error(`Invalid semver: ${version}`);
	}

	return match.slice(1).map(Number);
}

function bumpVersion(version, target) {
	const [major, minor, patch] = parseSemver(version);

	if (target === "major") {
		return `${major + 1}.0.0`;
	}
	if (target === "minor") {
		return `${major}.${minor + 1}.0`;
	}
	if (target === "patch") {
		return `${major}.${minor}.${patch + 1}`;
	}
	if (SEMVER_PATTERN.test(target)) {
		return target;
	}

	throw new Error(
		`Expected version target ${VERSION_TARGETS.join("|")} or X.Y.Z, got ${target ?? "missing"}`,
	);
}

function run(command) {
	const commandRun = Bun.spawnSync(command, {
		stderr: "inherit",
		stdout: "inherit",
	});

	if (commandRun.exitCode !== 0) {
		throw new Error(`Command failed: ${command.join(" ")}`);
	}
}

const target = process.argv[2];
if (!target) {
	console.error("Usage: bun run version -- 0.4.5|patch|minor|major");
	process.exit(1);
}

const packageJson = readJson("package.json");
const jsrJson = readJson("jsr.json");
const indexSource = readFileSync("src/index.ts", "utf8");
const revisionMatch = indexSource.match(/export const REVISION = "([^"]+)";/u);
const revisionVersion = revisionMatch?.[1];

if (
	packageJson.version !== jsrJson.version ||
	packageJson.version !== revisionVersion
) {
	console.error(
		`Version mismatch: package.json=${packageJson.version} jsr.json=${jsrJson.version} REVISION=${revisionVersion}`,
	);
	process.exit(1);
}

const nextVersion = bumpVersion(packageJson.version, target);
packageJson.version = nextVersion;
jsrJson.version = nextVersion;

writeJson("package.json", packageJson);
writeJson("jsr.json", jsrJson);
writeFileSync(
	"src/index.ts",
	indexSource.replace(
		/export const REVISION = "[^"]+";/u,
		`export const REVISION = "${nextVersion}";`,
	),
);

run(["bun", "install", "--lockfile-only"]);
console.log(`Version set to ${nextVersion}`);

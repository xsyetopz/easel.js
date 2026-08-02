import { readFileSync, writeFileSync } from "node:fs";

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/u;
const VERSION_TARGETS = ["patch", "minor", "major"];

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, body) {
	writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`);
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

const target = process.argv[2];
if (!target) {
	console.error("Usage: bun run version -- 0.5.0|patch|minor|major");
	process.exit(1);
}

const packageJson = readJson("package.json");
const jsrJson = readJson("jsr.json");
const indexSource = readFileSync("src/index.ts", "utf8");
const readmeSource = readFileSync("README.md", "utf8");
const agentsSource = readFileSync("AGENTS.md", "utf8");
const revisionMatch = indexSource.match(/export const REVISION = "([^"]+)";/u);
const revisionVersion = revisionMatch?.[1];
const readmeRevisionMatch = readmeSource.match(
	/^\| Revision \| `(?<version>[^`]+)` \|$/mu,
);
const readmeRevision = readmeRevisionMatch?.groups?.version;
const agentsRevisionMatch = agentsSource.match(
	/current source revision is `(?<version>\d+\.\d+\.\d+)`;/u,
);
const agentsRevision = agentsRevisionMatch?.groups?.version;

if (
	packageJson.version !== jsrJson.version ||
	packageJson.version !== revisionVersion ||
	packageJson.version !== readmeRevision ||
	packageJson.version !== agentsRevision
) {
	console.error(
		`Version mismatch: package.json=${packageJson.version} jsr.json=${jsrJson.version} REVISION=${revisionVersion} README=${readmeRevision} AGENTS=${agentsRevision}`,
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
writeFileSync(
	"README.md",
	readmeSource.replace(
		/^\| Revision \| `[^`]+` \|$/mu,
		`| Revision | \`${nextVersion}\` |`,
	),
);
writeFileSync(
	"AGENTS.md",
	agentsSource.replace(
		/current source revision is `\d+\.\d+\.\d+`;/u,
		`current source revision is \`${nextVersion}\`;`,
	),
);
console.log(`Version set to ${nextVersion}`);

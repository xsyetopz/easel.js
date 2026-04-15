import { readFileSync } from "node:fs";

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/u;

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function run(command, options = {}) {
	const commandRun = Bun.spawnSync(command, {
		stderr: options.capture ? "pipe" : "inherit",
		stdout: options.capture ? "pipe" : "inherit",
	});
	const stdoutText = options.capture
		? new TextDecoder().decode(commandRun.stdout).trim()
		: "";
	const stderrText = options.capture
		? new TextDecoder().decode(commandRun.stderr).trim()
		: "";

	if (commandRun.exitCode !== 0) {
		if (stdoutText) {
			console.error(stdoutText);
		}
		if (stderrText) {
			console.error(stderrText);
		}
		throw new Error(`Command failed: ${command.join(" ")}`);
	}

	return stdoutText;
}

const version = process.argv[2];
if (!SEMVER_PATTERN.test(version ?? "")) {
	console.error("Usage: bun run release -- X.Y.Z");
	process.exit(1);
}

const packageJson = readJson("package.json");
if (packageJson.version !== version) {
	console.error(
		`package.json version ${packageJson.version} does not match ${version}`,
	);
	process.exit(1);
}

const branchName = run(["git", "branch", "--show-current"], { capture: true });
if (branchName !== "main") {
	console.error(`Release must run from main, got ${branchName}`);
	process.exit(1);
}

const gitStatus = run(["git", "status", "--porcelain"], { capture: true });
if (gitStatus) {
	console.error("Release requires a clean working tree.");
	console.error(gitStatus);
	process.exit(1);
}

const tagName = `v${version}`;
const localTag = run(["git", "tag", "--list", tagName], { capture: true });
if (localTag) {
	console.error(`Tag already exists locally: ${tagName}`);
	process.exit(1);
}

if (!Bun.which("gh")) {
	console.error("GitHub CLI is required: gh");
	process.exit(1);
}

run([
	"gh",
	"workflow",
	"run",
	"release.yml",
	"--ref",
	"main",
	"-f",
	`version=${version}`,
]);
console.log(`Release workflow dispatched for ${tagName}`);

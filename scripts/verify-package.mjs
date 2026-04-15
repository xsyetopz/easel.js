import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REQUIRED_PACKAGE_FILES = [
	"dist/index.es.js",
	"dist/index.cjs",
	"dist/index.umd.js",
	"dist/index.d.ts",
];

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function run(command, options = {}) {
	const commandRun = Bun.spawnSync(command, {
		cwd: options.cwd,
		stderr: options.capture ? "pipe" : "inherit",
		stdout: options.capture ? "pipe" : "inherit",
	});

	const stdoutText = options.capture
		? new TextDecoder().decode(commandRun.stdout)
		: "";
	const stderrText = options.capture
		? new TextDecoder().decode(commandRun.stderr)
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

function packPackage(directory) {
	const packJson = run(
		[
			"npm",
			"--cache",
			"/tmp/easel-npm-cache",
			"pack",
			"--ignore-scripts",
			"--pack-destination",
			directory,
			"--json",
		],
		{ capture: true },
	);
	const [packEntry] = JSON.parse(packJson);

	return packEntry;
}

function verifyFileList(packEntry) {
	const packedPaths = new Set(packEntry.files.map((file) => file.path));
	const missingPaths = REQUIRED_PACKAGE_FILES.filter(
		(path) => !packedPaths.has(path),
	);

	if (missingPaths.length > 0) {
		throw new Error(
			`Package is missing required files: ${missingPaths.join(", ")}`,
		);
	}

	const staleDeclarationPaths = packEntry.files
		.map((file) => file.path)
		.filter(
			(path) =>
				path.startsWith("src/") &&
				(path.endsWith(".d.ts") || path.endsWith(".d.ts.map")) &&
				path !== "src/globals.d.ts",
		);

	if (staleDeclarationPaths.length > 0) {
		throw new Error(
			`Package includes stale source declarations: ${staleDeclarationPaths.join(", ")}`,
		);
	}
}

function smokeInstall(packEntry, packDirectory, packageName, version) {
	const smokeDirectory = mkdtempSync(join(tmpdir(), "easel-smoke-"));
	const tarballPath = join(packDirectory, packEntry.filename);
	try {
		run(["npm", "--cache", "/tmp/easel-npm-cache", "init", "-y"], {
			cwd: smokeDirectory,
		});
		run(
			[
				"npm",
				"--cache",
				"/tmp/easel-npm-cache",
				"install",
				tarballPath,
				"--ignore-scripts",
			],
			{ cwd: smokeDirectory },
		);
		run(
			[
				"node",
				"--input-type=module",
				"-e",
				`import * as pkg from ${JSON.stringify(packageName)}; if (pkg.REVISION !== ${JSON.stringify(version)}) throw new Error(\`Bad ESM REVISION: \${pkg.REVISION}\`);`,
			],
			{ cwd: smokeDirectory },
		);
		run(
			[
				"node",
				"-e",
				`const pkg = require(${JSON.stringify(packageName)}); if (pkg.REVISION !== ${JSON.stringify(version)}) throw new Error(\`Bad CJS REVISION: \${pkg.REVISION}\`);`,
			],
			{ cwd: smokeDirectory },
		);
	} finally {
		rmSync(smokeDirectory, { force: true, recursive: true });
	}
}

const packageJson = readJson("package.json");
const packDirectory = mkdtempSync(join(tmpdir(), "easel-pack-"));
try {
	const packEntry = packPackage(packDirectory);
	verifyFileList(packEntry);
	smokeInstall(packEntry, packDirectory, packageJson.name, packageJson.version);
	console.log(
		`Package verified: ${packEntry.filename} (${packEntry.entryCount} files, ${packEntry.unpackedSize} bytes)`,
	);
} finally {
	rmSync(packDirectory, { force: true, recursive: true });
}

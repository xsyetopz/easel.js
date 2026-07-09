import {
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
} from "node:fs";
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
	const parsedPackJson = JSON.parse(packJson);
	const packEntry = Array.isArray(parsedPackJson)
		? parsedPackJson[0]
		: parsedPackJson;

	if (packEntry?.filename && Array.isArray(packEntry.files)) {
		return packEntry;
	}

	return inspectPackedTarball(directory);
}

function inspectPackedTarball(directory) {
	const tarballNames = readdirSync(directory).filter((name) =>
		name.endsWith(".tgz"),
	);
	if (tarballNames.length !== 1) {
		throw new Error(
			`Expected exactly one packed tarball in ${directory}, found ${tarballNames.length}`,
		);
	}

	const filename = tarballNames[0];
	const extractDirectory = mkdtempSync(join(tmpdir(), "easel-pack-inspect-"));
	try {
		run(["tar", "-xzf", join(directory, filename), "-C", extractDirectory]);
		const packageDirectory = join(extractDirectory, "package");
		const files = [];
		let unpackedSize = 0;
		collectPackedFiles(packageDirectory, "", files, (size) => {
			unpackedSize += size;
		});

		return {
			filename,
			files: files.map((path) => ({ path })),
			entryCount: files.length,
			unpackedSize,
		};
	} finally {
		rmSync(extractDirectory, { force: true, recursive: true });
	}
}

function collectPackedFiles(directory, prefix, files, onFileSize) {
	for (const entryName of readdirSync(directory)) {
		const entryPath = join(directory, entryName);
		const relativePath = prefix ? `${prefix}/${entryName}` : entryName;
		const stat = statSync(entryPath);
		if (stat.isDirectory()) {
			collectPackedFiles(entryPath, relativePath, files, onFileSize);
		} else if (stat.isFile()) {
			files.push(relativePath);
			onFileSize(stat.size);
		}
	}
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

const OUTDATED_ROW_PATTERN = /^\|\s+[^\s|-][^|]*\|/u;

const outdatedRun = Bun.spawnSync(
	["bun", "outdated", "--latest", "--no-progress"],
	{
		stderr: "pipe",
		stdout: "pipe",
	},
);

const stdoutText = new TextDecoder().decode(outdatedRun.stdout);
const stderrText = new TextDecoder().decode(outdatedRun.stderr);

if (outdatedRun.exitCode !== 0) {
	console.error(stderrText || stdoutText);
	process.exit(outdatedRun.exitCode);
}

const outdatedLines = stdoutText
	.split(/\r?\n/u)
	.filter(
		(line) =>
			OUTDATED_ROW_PATTERN.test(line) &&
			!line.includes("| Package") &&
			!line.includes("| Workspace"),
	);

if (outdatedLines.length > 0) {
	console.error(
		"Outdated dependencies found. Update every dependency before publishing.",
	);
	console.error(stdoutText.trim());
	process.exit(1);
}

console.log("Dependencies are current.");

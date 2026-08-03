import { spawnSync } from "bun";

const OUTDATED_ROW_PATTERN = /^\|\s+[^\s|-][^|]*\|/u;
const ALLOWED_OUTDATED_ROWS = [
  // Astro check still depends on the TypeScript 5/6 compiler API.
  // The project keeps TypeScript 7 for the package and uses the alias
  // `typescript-compiler-api` for patched Astro/Volar compatibility.
  /^\|\s+typescript \(dev\)\s+\|\s+6\.\d+\.\d+\s+\|\s+6\.\d+\.\d+\s+\|\s+7\.\d+\.\d+\s+\|/u,
];

const outdatedRun = spawnSync(
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
      !line.includes("| Workspace") &&
      !ALLOWED_OUTDATED_ROWS.some((pattern) => pattern.test(line)),
  );

if (outdatedLines.length > 0) {
  console.error(
    "Outdated dependencies found. Update every dependency before publishing.",
  );
  console.error(stdoutText.trim());
  process.exit(1);
}

console.log("Dependencies are current.");

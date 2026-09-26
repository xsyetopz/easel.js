// Compares tsc diagnostics for naive ports against the codes each naive.ts
// declares with a trailing "// expect TSnnnn" comment on the offending line.
// Usage: bun expect-errors.ts TSC_OUTPUT CWD NAIVE_FILE...
// Exit 0 when expected and actual (file, line, code) sets match, 1 when they
// differ, 2 on bad usage.

import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

const [outputPath, cwd, ...files] = process.argv.slice(2);
if (outputPath === undefined || cwd === undefined || files.length === 0) {
  console.error("usage: expect-errors.ts TSC_OUTPUT CWD NAIVE_FILE...");
  process.exit(2);
}

const expected = new Set<string>();
for (const file of files) {
  const real = realpathSync(file);
  readFileSync(real, "utf8")
    .split("\n")
    .forEach((line, index) => {
      const match = /\/\/ expect ((?:TS\d+ ?)+)$/.exec(line);
      for (const code of match?.[1]?.trim().split(" ") ?? []) {
        expected.add(`${real}:${index + 1}:${code}`);
      }
    });
}

const actual = new Set<string>();
const pattern = /^(.+?)\((\d+),\d+\): error (TS\d+):/;
for (const line of readFileSync(outputPath, "utf8").split("\n")) {
  const match = pattern.exec(line);
  if (!match?.[1] || !match[2] || !match[3]) continue;
  const real = realpathSync(resolve(cwd, match[1]));
  actual.add(`${real}:${match[2]}:${match[3]}`);
}

let failed = false;
for (const key of expected) {
  const name = key.split("/").slice(-2).join("/");
  if (actual.has(key)) {
    console.log(`PASS naive rejected: ${name}`);
  } else {
    console.log(`FAIL naive not rejected: ${name}`);
    failed = true;
  }
}
for (const key of actual) {
  if (!expected.has(key)) {
    console.log(`FAIL unexpected diagnostic: ${key}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);

import { readFile } from "node:fs/promises";
import process from "node:process";
import { Glob } from "bun";
import * as ts from "typescript-api";
import { modernApiViolations } from "./api-policy/modern-api.ts";

const violations: string[] = [];
for await (const fileName of new Glob("src/**/*.ts").scan(".")) {
  const source = ts.createSourceFile(
    fileName,
    await readFile(fileName, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  violations.push(...modernApiViolations(source));
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(
  "Modern API policy passed: no enums, static class items, private keywords, underscore-prefixed public members, or redundant accessor methods.",
);

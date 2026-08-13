import { readFile } from "node:fs/promises";
import process from "node:process";
import { Glob } from "bun";
import * as ts from "typescript-api";
import { publicJsDocIssues } from "./api-policy/public-jsdoc-policy.ts";

const missing: string[] = [];
const lowQuality: string[] = [];
for await (const fileName of new Glob("src/**/*.ts").scan(".")) {
  if (fileName === "src/index.ts") continue;
  const source = ts.createSourceFile(
    fileName,
    await readFile(fileName, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const issues = publicJsDocIssues(source);
  missing.push(...issues.missing);
  lowQuality.push(...issues.lowQuality);
}

if (missing.length > 0) {
  console.error(missing.join("\n"));
  console.error(`Missing public JSDoc: ${missing.length}`);
  process.exit(1);
}

if (lowQuality.length > 0) {
  console.error(lowQuality.join("\n"));
  console.error(`Low-quality public JSDoc: ${lowQuality.length}`);
  process.exit(1);
}

console.log(
  "All exported declarations and public members have substantive JSDoc summaries.",
);

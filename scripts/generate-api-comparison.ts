import { dirname, join, resolve } from "node:path";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import process from "node:process";
import { createProgram, sys } from "typescript-api";
import { COMPILER_OPTIONS, exportFacts } from "./api-comparison/extract.ts";
import {
  compareFacts as compareFactsImplementation,
  formatReport as formatReportImplementation,
} from "./api-comparison/compare.ts";
import { escapeCell as escapeCellImplementation } from "./api-comparison/text.ts";
type ComparisonRow = import("./api-comparison/types.ts").ComparisonRow;
type FactKind = import("./api-comparison/types.ts").FactKind;
type PublicFact = import("./api-comparison/types.ts").PublicFact;

const ROOT = resolve(import.meta.dir, "..");
const EASEL_ROOT = join(ROOT, "src", "index.ts");
const THREE_SOURCE_ROOT = join(ROOT, "node_modules", "three", "src");
const THREE_ENTRY = join(THREE_SOURCE_ROOT, "Three.Core.js");
const OUTPUT = join(ROOT, "api-comparison", "three-core.txt");

export const compareFacts: typeof compareFactsImplementation =
  compareFactsImplementation;
export const formatReport: typeof formatReportImplementation =
  formatReportImplementation;
export const escapeCell: typeof escapeCellImplementation =
  escapeCellImplementation;
export type { ComparisonRow, FactKind, PublicFact };

function makeProgram(
  rootNames: readonly string[],
): import("typescript-api").Program {
  return createProgram(rootNames, COMPILER_OPTIONS);
}

function extractSide(root: string, roots: readonly string[]): PublicFact[] {
  const program = makeProgram(roots);
  const source = program.getSourceFile(root);
  if (!source) throw new Error(`Cannot read API entrypoint: ${root}`);
  return exportFacts({
    checker: program.getTypeChecker(),
    program,
    root: source,
  });
}

function packageVersion(packagePath: string): string {
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
    name?: string;
    version?: string;
  };
  return `${packageJson.name ?? "unknown"}@${packageJson.version ?? "unknown"}`;
}

export function generateReport(): string {
  if (!existsSync(EASEL_ROOT)) {
    throw new Error(`Missing EASEL entrypoint: ${EASEL_ROOT}`);
  }
  if (!existsSync(THREE_ENTRY)) {
    throw new Error(`Missing three entrypoint: ${THREE_ENTRY}`);
  }
  const easelRoots = sys.readDirectory(
    join(ROOT, "src"),
    [".ts", ".tsx"],
    undefined,
    ["**/*"],
  );
  const threeRoots = sys.readDirectory(THREE_SOURCE_ROOT, [".js"], undefined, [
    "**/*",
  ]);
  const easelFacts = extractSide(EASEL_ROOT, [
    EASEL_ROOT,
    ...easelRoots.filter((root) => root !== EASEL_ROOT),
  ]);
  const threeFacts = extractSide(THREE_ENTRY, threeRoots);
  return formatReport(
    compareFacts(easelFacts, threeFacts),
    packageVersion(join(ROOT, "package.json")),
    packageVersion(join(ROOT, "node_modules", "three", "package.json")),
  );
}

function main(): void {
  const report = generateReport();
  const check = process.argv.includes("--check");
  if (check) {
    const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, "utf8") : "";
    if (current !== report) {
      console.error(
        "api-comparison/three-core.txt is stale; run bun run api:compare",
      );
      process.exitCode = 1;
    }
  } else {
    mkdirSync(dirname(OUTPUT), { recursive: true });
    const temporary = `${OUTPUT}.tmp-${process.pid}`;
    writeFileSync(temporary, report, "utf8");
    renameSync(temporary, OUTPUT);
  }
  process.stdout.write(report);
}

if (import.meta.main) main();

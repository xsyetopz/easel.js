#!/usr/bin/env bun
/**
 * Prints the @xsyetopz/easel public API from source instead of memory.
 *
 * usage:
 *   bun scripts/easel_api.ts exports [--root DIR] [--grep TEXT]
 *   bun scripts/easel_api.ts show NAME... [--root DIR]
 *   bun scripts/easel_api.ts constants [NAME...] [--root DIR]
 *
 * exports    Root exports from DIR/src/index.ts grouped by source module,
 *            values and types separated. Cross-checks the parsed value
 *            names against Object.keys(await import(index)); a mismatch
 *            exits 1.
 * show       The emitted declaration of each named export. A repository
 *            (DIR has tsconfig.build.json and src/index.ts) always emits
 *            declarations from src into a temporary directory with DIR's
 *            tsc, because its dist/ may be stale. An installed package
 *            without tsconfig.build.json uses DIR/dist/<module>.d.ts.
 * constants  Runtime values of exported plain objects, numbers, and
 *            strings (Side, Loop, Interpolation, ...), as JSON.
 *
 * DIR is the EASEL repository or an installed package directory such as
 * node_modules/@xsyetopz/easel (the package ships src/ and dist/). It
 * defaults to the repository that contains this skill.
 *
 * Exit status: 0 success, 1 unknown name or source/runtime mismatch,
 * 2 bad usage or unreadable input.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

interface ExportEntry {
  /** Name as imported from the package root. */
  name: string;
  /** Name inside the source module when the root re-exports an alias. */
  local: string;
  module: string;
  typeOnly: boolean;
}

class UsageError extends Error {}

const USAGE =
  "usage: bun scripts/easel_api.ts exports|show|constants " +
  "[NAME...] [--root DIR] [--grep TEXT]";

const HELP = `Print the @xsyetopz/easel public API from source.

Usage:
  bun scripts/easel_api.ts exports [--root DIR] [--grep TEXT]
  bun scripts/easel_api.ts show NAME... [--root DIR]
  bun scripts/easel_api.ts constants [NAME...] [--root DIR]

Modes:
  exports    Root exports grouped by source module, values and types apart.
  show       Emitted .d.ts declaration of each named export. In a
             repository (tsconfig.build.json + src/index.ts) it always
             emits from src, never from a possibly stale dist/; an
             installed package without tsconfig.build.json uses dist/.
  constants  Runtime values of exported constant objects, as JSON.

Options:
  --root DIR   EASEL repository or node_modules/@xsyetopz/easel
               (default: the repository containing this skill)
  --grep TEXT  exports only: case-insensitive substring match on the
               export name and module path, not a regex; "a|b"
               matches either substring

Examples:
  bun scripts/easel_api.ts exports --grep material
  bun scripts/easel_api.ts exports --grep "loader|exporter"
  bun scripts/easel_api.ts show Renderer PerspectiveCamera
  bun scripts/easel_api.ts constants Loop Side

Exit status: 0 success; 1 unknown name or source/runtime mismatch;
2 bad usage or unreadable input.`;

function parseArgs(argv: string[]) {
  const [mode, ...rest] = argv;
  const names: string[] = [];
  let root = resolve(import.meta.dir, "../../../..");
  let grep: string | undefined;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] ?? "";
    if (arg === "--root" || arg === "--grep") {
      const value = rest[++i];
      if (value === undefined) throw new UsageError(`${arg} needs a value`);
      if (arg === "--root") root = resolve(value);
      else grep = value;
    } else if (arg.startsWith("--")) {
      throw new UsageError(`unknown option ${arg}`);
    } else {
      names.push(arg);
    }
  }
  if (mode !== "exports" && mode !== "show" && mode !== "constants") {
    throw new UsageError(USAGE);
  }
  if (mode === "show" && names.length === 0) {
    throw new UsageError("show needs at least one NAME");
  }
  return { mode, names, root, grep };
}

function indexPath(root: string): string {
  const path = join(root, "src/index.ts");
  if (!existsSync(path)) throw new UsageError(`${path} not found`);
  return path;
}

/**
 * `--grep` filter: case-insensitive substring match against the export name
 * and its module path; `a|b` matches either alternative. Not a regex.
 */
export function matchesGrep(text: string, grep: string): boolean {
  const hay = text.toLowerCase();
  return grep
    .toLowerCase()
    .split("|")
    .some((part) => part !== "" && hay.includes(part));
}

/** Parses every `export` statement in src/index.ts. */
export function parseIndex(source: string): {
  entries: ExportEntry[];
  unparsed: string[];
} {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const entries: ExportEntry[] = [];
  const unparsed: string[] = [];
  const statement =
    /export\s+(type\s+)?\{([^}]*)\}\s*from\s*"([^"]+)"\s*;|export\s+const\s+(\w+)/g;
  let covered = 0;
  for (const match of code.matchAll(statement)) {
    covered++;
    if (match[4]) {
      entries.push({
        name: match[4],
        local: match[4],
        module: "./index.ts",
        typeOnly: false,
      });
      continue;
    }
    const blockType = Boolean(match[1]);
    const module = match[3] ?? "";
    for (const raw of (match[2] ?? "").split(",")) {
      const item = raw.trim();
      if (!item) continue;
      const spec = /^(type\s+)?(\w+)(?:\s+as\s+(\w+))?$/.exec(item);
      if (!spec?.[2]) {
        unparsed.push(item);
        continue;
      }
      entries.push({
        name: spec[3] ?? spec[2],
        local: spec[2],
        module,
        typeOnly: blockType || Boolean(spec[1]),
      });
    }
  }
  const total = code.match(/^\s*export\s/gm)?.length ?? 0;
  if (total !== covered) {
    unparsed.push(`${total - covered} export statement(s) not recognized`);
  }
  return { entries, unparsed };
}

function loadEntries(root: string): ExportEntry[] {
  const { entries, unparsed } = parseIndex(readFileSync(indexPath(root), "utf8"));
  if (unparsed.length > 0) {
    throw new Error(`unparsed exports in src/index.ts: ${unparsed.join("; ")}`);
  }
  return entries;
}

async function runtimeValues(root: string): Promise<Record<string, unknown>> {
  return (await import(indexPath(root))) as Record<string, unknown>;
}

async function printExports(root: string, grep?: string): Promise<number> {
  const entries = loadEntries(root);
  const runtime = new Set(Object.keys(await runtimeValues(root)));
  const parsedValues = new Set(
    entries.filter((e) => !e.typeOnly).map((e) => e.name),
  );
  const missing = [...parsedValues].filter((n) => !runtime.has(n));
  const extra = [...runtime].filter((n) => !parsedValues.has(n));

  const byModule = new Map<string, ExportEntry[]>();
  for (const entry of entries) {
    if (grep && !matchesGrep(`${entry.name} ${entry.module}`, grep)) continue;
    const list = byModule.get(entry.module) ?? [];
    list.push(entry);
    byModule.set(entry.module, list);
  }
  const revision = (await runtimeValues(root))["REVISION"];
  console.log(`# @xsyetopz/easel REVISION ${String(revision)}`);
  console.log(
    `# ${parsedValues.size} value exports, ` +
      `${entries.length - parsedValues.size} type-only exports`,
  );
  for (const [module, list] of byModule) {
    const label = (e: ExportEntry) =>
      e.local === e.name ? e.name : `${e.name} (= ${e.local})`;
    const values = list.filter((e) => !e.typeOnly).map(label);
    const types = list.filter((e) => e.typeOnly).map(label);
    let line = module;
    if (values.length) line += `\n  values: ${values.join(", ")}`;
    if (types.length) line += `\n  types: ${types.join(", ")}`;
    console.log(line);
  }
  if (missing.length || extra.length) {
    console.error(
      `MISMATCH parsed-not-at-runtime: ${missing.join(", ") || "-"}; ` +
        `runtime-not-parsed: ${extra.join(", ") || "-"}`,
    );
    return 1;
  }
  return 0;
}

/**
 * Chooses where `show` reads declarations. A repository (tsconfig.build.json
 * plus src/index.ts) always emits from src, because its dist/ may be stale.
 * Only an installed package without tsconfig.build.json uses dist/.
 */
export function declarationSource(root: string): "emit" | "dist" {
  const config = join(root, "tsconfig.build.json");
  if (existsSync(config) && existsSync(join(root, "src/index.ts"))) {
    return "emit";
  }
  if (existsSync(join(root, "dist/index.d.ts"))) return "dist";
  throw new UsageError(`no dist/index.d.ts and no ${config} to emit from`);
}

function declarationRoot(root: string): { dir: string; cleanup(): void } {
  if (declarationSource(root) === "dist") {
    return { dir: join(root, "dist"), cleanup() {} };
  }
  const config = join(root, "tsconfig.build.json");
  const out = mkdtempSync(join(tmpdir(), "easel-dts-"));
  const localTsc = join(root, "node_modules/.bin/tsc");
  const tsc = existsSync(localTsc) ? [localTsc] : ["bunx", "tsc"];
  const result = Bun.spawnSync(
    [...tsc, "-p", config, "--declarationDir", out, "--declarationMap", "false"],
    { cwd: root, stdout: "pipe", stderr: "pipe" },
  );
  if (result.exitCode !== 0) {
    rmSync(out, { recursive: true, force: true });
    throw new Error(`tsc declaration emit failed:\n${result.stdout}`);
  }
  return { dir: out, cleanup: () => rmSync(out, { recursive: true, force: true }) };
}

/** Extracts one exported declaration (all overloads) from .d.ts text. */
export function extractDeclaration(dts: string, name: string): string {
  const lines = dts.split("\n");
  const head = new RegExp(
    "^export (?:declare )?(?:abstract )?" +
      `(?:class|interface|function|const|let|type|enum|namespace) ${name}\\b`,
  );
  const blocks: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!head.test(lines[i] ?? "")) continue;
    let start = i;
    while (start > 0 && /^\s*(\/\*\*|\*)/.test(lines[start - 1] ?? "")) start--;
    let depth = 0;
    let end = i;
    let inComment = false;
    for (; end < lines.length; end++) {
      const line = lines[end] ?? "";
      // Count brackets in code only: JSDoc such as "in [0, 1)" must not
      // close the declaration early.
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        const pair = line.slice(c, c + 2);
        if (inComment) {
          if (pair === "*/") {
            inComment = false;
            c++;
          }
          continue;
        }
        if (pair === "/*") {
          inComment = true;
          c++;
          continue;
        }
        if (pair === "//") break;
        if (char === "{" || char === "(") depth++;
        else if (char === "}" || char === ")") depth--;
      }
      if (inComment) continue;
      if (depth <= 0 && (/[;}]\s*$/.test(line) || line.trim() === "")) break;
    }
    blocks.push(lines.slice(start, end + 1).join("\n"));
    i = end;
  }
  return blocks.join("\n");
}

function show(root: string, names: string[]): number {
  const entries = loadEntries(root);
  const decl = declarationRoot(root);
  let status = 0;
  try {
    for (const name of names) {
      const entry = entries.find((e) => e.name === name);
      if (!entry) {
        console.error(`UNKNOWN ${name}: not exported from the package root`);
        status = 1;
        continue;
      }
      const file = join(decl.dir, entry.module.replace(/\.ts$/, ".d.ts"));
      const text = extractDeclaration(readFileSync(file, "utf8"), entry.local);
      console.log(`// ${name} from ${entry.module}` +
        (entry.local === name ? "" : ` (declared as ${entry.local})`));
      if (!text) {
        console.error(`NOT FOUND ${entry.local} in ${file}`);
        status = 1;
        continue;
      }
      console.log(text);
    }
  } finally {
    decl.cleanup();
  }
  return status;
}

async function printConstants(root: string, names: string[]): Promise<number> {
  const values = await runtimeValues(root);
  const out: Record<string, unknown> = {};
  let status = 0;
  const wanted = names.length > 0 ? names : Object.keys(values).sort();
  for (const name of wanted) {
    if (!(name in values)) {
      console.error(`UNKNOWN ${name}`);
      status = 1;
      continue;
    }
    const value = values[name];
    const plainObject =
      typeof value === "object" &&
      value !== null &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.values(value).every((v) => ["number", "string"].includes(typeof v));
    if (plainObject || typeof value === "number" || typeof value === "string") {
      out[name] = value;
    } else if (names.length > 0) {
      console.error(`NOT A CONSTANT ${name}: ${typeof value}`);
      status = 1;
    }
  }
  console.log(JSON.stringify(out, undefined, 2));
  return status;
}

async function main(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP);
    return 0;
  }
  const args = parseArgs(argv);
  if (args.mode === "exports") return printExports(args.root, args.grep);
  if (args.mode === "show") return show(args.root, args.names);
  return printConstants(args.root, args.names);
}

if (import.meta.main) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`error: ${message}`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  }
}


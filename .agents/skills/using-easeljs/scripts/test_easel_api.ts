#!/usr/bin/env bun
// Self-test for easel_api.ts: parser fixtures plus exit codes against the
// real source. Run: bun scripts/test_easel_api.ts [--root DIR]
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  declarationSource,
  extractDeclaration,
  matchesGrep,
  parseIndex,
} from "./easel_api.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
  if (!ok) failures++;
}

const index = `
/** doc */
export const REVISION: string = "0.8.0";
// comment export { Fake } from "./fake.ts";
export { A, type B, c as d } from "./a.ts";
export type {
  E,
  F,
} from "./e.ts";
`;
const parsed = parseIndex(index);
const names = parsed.entries.map(
  (e) => `${e.name}:${e.local}:${e.typeOnly ? "t" : "v"}`,
);
check(
  "parseIndex values, inline type, alias, type block, comments",
  JSON.stringify(names) ===
    JSON.stringify(["REVISION:REVISION:v", "A:A:v", "B:B:t", "d:c:v",
      "E:E:t", "F:F:t"]),
  names.join(" "),
);
check(
  "parseIndex flags unknown export forms",
  parseIndex(`${index}\nexport * from "./x.ts";\n`).unparsed.length === 1,
);

const dts = `/** Adds. */
export declare function add(a: number): number;
export declare function add(a: string): string;
export declare class Box {
    map: (value: number) => boolean;
    get size(): number;
}
export interface Other {
}
`;
const add = extractDeclaration(dts, "add");
check("extractDeclaration keeps overloads and JSDoc",
  add.split("\n").length === 3 && add.startsWith("/** Adds. */"), add);
const box = extractDeclaration(dts, "Box");
const commented = extractDeclaration(`export declare class V {
    /** Random value in [0, 1). */
    random(): this;
    after(): this;
}
`, "V");
check("extractDeclaration ignores brackets inside comments",
  commented.includes("after(): this;") && commented.endsWith("}"), commented);
check("extractDeclaration survives arrow types",
  box.endsWith("}") && !box.includes("Other"), box);

check("matchesGrep is a case-insensitive substring match",
  matchesGrep("OBJLoader ./loaders/OBJLoader.ts", "objload") &&
    !matchesGrep("OBJLoader ./loaders/OBJLoader.ts", "^OBJ"));
check("matchesGrep splits alternatives on |",
  matchesGrep("GCodeExporter ./exporters/GCodeExporter.ts",
    "loader|exporter") && !matchesGrep("Vector3 ./math/Vector3.ts", "zzz|qqq|"));

// A repository with a stale dist/ must emit from src; a package without
// tsconfig.build.json reads dist/.
const fixture = mkdtempSync(join(tmpdir(), "easel-api-test-"));
try {
  mkdirSync(join(fixture, "src"));
  mkdirSync(join(fixture, "dist"));
  writeFileSync(join(fixture, "src/index.ts"), "");
  writeFileSync(join(fixture, "dist/index.d.ts"), "");
  writeFileSync(join(fixture, "tsconfig.build.json"), "{}");
  check("declarationSource ignores dist/ in a repository",
    declarationSource(fixture) === "emit");
  rmSync(join(fixture, "tsconfig.build.json"));
  check("declarationSource uses dist/ for an installed package",
    declarationSource(fixture) === "dist");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

const root = process.argv.includes("--root")
  ? ["--root", process.argv[process.argv.indexOf("--root") + 1] ?? ""]
  : [];
function run(args: string[]): { code: number; out: string } {
  const result = Bun.spawnSync(
    ["bun", `${import.meta.dir}/easel_api.ts`, ...args, ...root],
    { stdout: "pipe", stderr: "pipe" },
  );
  return {
    code: result.exitCode,
    out: `${result.stdout.toString()}${result.stderr.toString()}`,
  };
}
const exportsRun = run(["exports"]);
check("exports matches runtime (exit 0)", exportsRun.code === 0,
  exportsRun.out.split("\n")[0] ?? "");
const showRun = run(["show", "Renderer"]);
check("show Renderer prints prepare()", showRun.code === 0 &&
  showRun.out.includes("prepare(scene: Scene, camera: Camera"));
check("show unknown exits 1", run(["show", "WebGLRenderer"]).code === 1);
const vector = run(["show", "Vector3"]);
check("show Vector3 reaches setFromSpherical past a \"[0, 1)\" JSDoc",
  vector.code === 0 && vector.out.includes("setFromSpherical("));
const grepRun = run(["exports", "--grep", "OBJLoader|GCodeExporter"]);
check("exports --grep a|b lists both modules", grepRun.code === 0 &&
  grepRun.out.includes("OBJLoader.ts") &&
  grepRun.out.includes("GCodeExporter.ts"));
check("no mode exits 2", run([]).code === 2);
const constants = run(["constants", "Loop"]);
check("constants Loop prints Repeat 2201", constants.code === 0 &&
  constants.out.includes('"Repeat": 2201'));

if (failures > 0) {
  console.log(`${failures} failure(s)`);
  process.exitCode = 1;
}

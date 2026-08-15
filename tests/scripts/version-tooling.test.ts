import { afterEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const root = `${import.meta.dir}/../..`;
const fixtures: string[] = [];

type FixtureOptions = {
  packageVersion?: string;
  jsrVersion?: string;
  revisionSource?: string;
};

type CommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function createFixture(options: FixtureOptions = {}): string {
  const directory = mkdtempSync(join(tmpdir(), "easel-version-tooling-"));
  fixtures.push(directory);
  mkdirSync(join(directory, "src"));
  const packageVersion = options.packageVersion ?? "1.2.3";
  const jsrVersion = options.jsrVersion ?? packageVersion;
  const revisionSource =
    options.revisionSource ?? 'export const REVISION: string = "1.2.3";\n';

  writeFileSync(
    join(directory, "package.json"),
    `${JSON.stringify(
      {
        name: "fixture",
        version: packageVersion,
        note: `${packageVersion} package note`,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(directory, "jsr.json"),
    `${JSON.stringify(
      {
        name: "fixture",
        version: jsrVersion,
        note: `${jsrVersion} JSR note`,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(directory, "src/index.ts"), revisionSource);
  return directory;
}

function runCommand(directory: string, ...arguments_: string[]): CommandResult {
  const result = spawnSync("python3", ["-m", "scripts", ...arguments_], {
    cwd: directory,
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONPATH: root,
    },
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function readJson(path: string): { version?: unknown; note?: unknown } {
  return JSON.parse(readFileSync(path, "utf8")) as {
    version?: unknown;
    note?: unknown;
  };
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { force: true, recursive: true });
  }
});

describe("version metadata tooling", () => {
  it.each([
    ['export const REVISION = "1.2.3";\n', "untyped"],
    ['export const REVISION: string = "1.2.3";\n', "typed"],
  ])("accepts a %s literal declaration", (revisionSource) => {
    const directory = createFixture({ revisionSource });

    const result = runCommand(directory, "check-version");

    expect(result).toEqual({
      status: 0,
      stdout: "Version consistent: 1.2.3\n",
      stderr: "",
    });
  });

  it.each([
    ["missing", 'export const OTHER = "1.2.3";\n'],
    [
      "nonliteral",
      'const currentVersion = "1.2.3";\nexport const REVISION: string = currentVersion;\n',
    ],
    [
      "duplicate",
      'export const REVISION: string = "1.2.3";\nexport const REVISION = "1.2.3";\n',
    ],
  ])("rejects a %s REVISION declaration", (_caseName, revisionSource) => {
    const directory = createFixture({ revisionSource });
    const beforePackage = readFileSync(join(directory, "package.json"), "utf8");
    const beforeJsr = readFileSync(join(directory, "jsr.json"), "utf8");

    const checkResult = runCommand(directory, "check-version");
    const updateResult = runCommand(directory, "version", "patch");

    expect(checkResult.status).toBe(1);
    expect(checkResult.stderr).toBe(
      "src/index.ts REVISION has invalid version: missing\n",
    );
    expect(updateResult.status).toBe(1);
    expect(updateResult.stderr).toBe(
      "Version mismatch: package.json=1.2.3 jsr.json=1.2.3 REVISION=undefined\n",
    );
    expect(readFileSync(join(directory, "package.json"), "utf8")).toBe(
      beforePackage,
    );
    expect(readFileSync(join(directory, "jsr.json"), "utf8")).toBe(beforeJsr);
    expect(readFileSync(join(directory, "src/index.ts"), "utf8")).toBe(
      revisionSource,
    );
  });

  it("reports an invalid literal version", () => {
    const directory = createFixture({
      revisionSource: 'export const REVISION: string = "release";\n',
    });

    const result = runCommand(directory, "check-version");

    expect(result.status).toBe(1);
    expect(result.stderr).toBe(
      "src/index.ts REVISION has invalid version: release\n",
    );
  });

  it("reports version mismatches without changing files", () => {
    const revisionSource = 'export const REVISION: string = "1.2.3";\n';
    const directory = createFixture({
      jsrVersion: "1.2.4",
      revisionSource,
    });
    const beforePackage = readFileSync(join(directory, "package.json"), "utf8");
    const beforeJsr = readFileSync(join(directory, "jsr.json"), "utf8");

    const checkResult = runCommand(directory, "check-version");
    const updateResult = runCommand(directory, "version", "patch");

    const message =
      "Version mismatch: package.json=1.2.3 jsr.json=1.2.4 REVISION=1.2.3\n";
    expect(checkResult.status).toBe(1);
    expect(checkResult.stderr).toBe(message);
    expect(updateResult.status).toBe(1);
    expect(updateResult.stderr).toBe(message);
    expect(readFileSync(join(directory, "package.json"), "utf8")).toBe(
      beforePackage,
    );
    expect(readFileSync(join(directory, "jsr.json"), "utf8")).toBe(beforeJsr);
    expect(readFileSync(join(directory, "src/index.ts"), "utf8")).toBe(
      revisionSource,
    );
  });

  it.each([
    ["patch", "1.2.4"],
    ["minor", "1.3.0"],
    ["major", "2.0.0"],
    ["4.5.6", "4.5.6"],
  ])("applies a %s update exactly once", (target, expectedVersion) => {
    const revisionSource = [
      'const retainedVersion = "1.2.3";',
      'export const REVISION: string = "1.2.3";',
      'const retainedAgain = "1.2.3";',
      "",
    ].join("\n");
    const directory = createFixture({ revisionSource });

    const result = runCommand(directory, "version", target);

    expect(result).toEqual({
      status: 0,
      stdout: `Version set to ${expectedVersion}\n`,
      stderr: "",
    });
    const packageJson = readJson(join(directory, "package.json"));
    const jsrJson = readJson(join(directory, "jsr.json"));
    expect(packageJson).toMatchObject({
      version: expectedVersion,
      note: "1.2.3 package note",
    });
    expect(jsrJson).toMatchObject({
      version: expectedVersion,
      note: "1.2.3 JSR note",
    });
    expect(readFileSync(join(directory, "src/index.ts"), "utf8")).toBe(
      revisionSource.replace(
        'export const REVISION: string = "1.2.3";',
        `export const REVISION: string = "${expectedVersion}";`,
      ),
    );
  });
});

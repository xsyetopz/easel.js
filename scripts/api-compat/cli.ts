import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import process from "node:process";
import { diffManifests, diffManifestVersions } from "./diff.ts";
import {
  defaultSurfaceOptions,
  extractManifest,
  extractManifests,
} from "./extract.ts";
import { readMapping, validateMappingAgainstManifests } from "./mapping.ts";
import type {
  ApiManifest,
  CompatibilityReport,
  ExtractOptions,
  VersionDiffReport,
} from "./types.ts";
import {
  validateCompatibilityMapping,
  validateCompatibilityReport,
  validateLatestProbe,
  validateManifest,
  writeDeterministicJson,
} from "./validate.ts";

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function outputRoot(repositoryRoot: string): string {
  return resolve(
    repositoryRoot,
    argValue(process.argv.slice(2), "--output") ?? "api-compat/generated",
  );
}

function manifestPath(root: string, options: ExtractOptions): string {
  return resolve(
    root,
    "manifests",
    `${options.surface}-${options.packageVersion}.json`,
  );
}

async function extractAll(
  repositoryRoot: string,
  threeRoot?: string,
  timings = false,
): Promise<{ options: ExtractOptions[]; manifests: Map<string, ApiManifest> }> {
  const options = threeRoot
    ? defaultSurfaceOptions({ repositoryRoot, threeRoot })
    : defaultSurfaceOptions({ repositoryRoot });
  const manifests = new Map<string, ApiManifest>();
  for (const manifest of await extractManifests(options, { timings })) {
    validateManifest(manifest);
    manifests.set(manifest.surface.id, manifest);
  }
  return { options, manifests };
}

function generatedReport(
  easel: ApiManifest,
  three: ApiManifest[],
  mappingPath: string,
  easelPath: string,
  threePath: string,
): CompatibilityReport {
  const mapping = readMapping(mappingPath);
  validateCompatibilityMapping(mapping);
  const report = diffManifests(easel, three, mapping, {
    easelManifestPath: easelPath,
    threeManifestPath: threePath,
  });
  validateCompatibilityReport(report);
  return report;
}

export async function generate(
  repositoryRoot = process.cwd(),
  threeRoot?: string,
  timings = false,
): Promise<string[]> {
  const root = resolve(repositoryRoot);
  const out = outputRoot(root);
  mkdirSync(resolve(out, "manifests"), { recursive: true });
  const { options, manifests } = await extractAll(root, threeRoot, timings);
  const paths: string[] = [];
  for (const option of options) {
    const path = manifestPath(out, option);
    writeDeterministicJson(path, manifests.get(option.surface));
    paths.push(path);
  }
  const easelOption = options.find((item) => item.surface === "easel");
  const easel = manifests.get("easel");
  if (!(easelOption && easel)) {
    throw new Error("EASEL manifest was not generated");
  }
  const threeManifests = [
    "three-core",
    "three-addons",
    "three-webgpu",
    "three-tsl",
  ]
    .map((surface) => manifests.get(surface))
    .filter((manifest): manifest is ApiManifest => Boolean(manifest));
  validateMappingAgainstManifests(
    readMapping(resolve(root, "api-compat/mappings/three.json")),
    easel,
    threeManifests,
  );
  for (const surface of [
    "three-core",
    "three-addons",
    "three-webgpu",
    "three-tsl",
  ] as const) {
    const threeOption = options.find((item) => item.surface === surface);
    const three = manifests.get(surface);
    if (!(threeOption && three)) {
      throw new Error(`Missing ${surface} manifest`);
    }
    const report = generatedReport(
      easel,
      [three],
      resolve(root, "api-compat/mappings/three.json"),
      relative(root, manifestPath(out, easelOption)).replaceAll("\\", "/"),
      relative(root, manifestPath(out, threeOption)).replaceAll("\\", "/"),
    );
    const path = resolve(
      out,
      surface === "three-core"
        ? "compatibility.json"
        : `compatibility-${surface}.json`,
    );
    writeDeterministicJson(path, report);
    paths.push(path);
  }
  return paths;
}

function checkFile(path: string, expected: unknown): void {
  const content = readFileSync(path, "utf8");
  const wanted = `${JSON.stringify(expected, null, "\t")}\n`;
  if (content !== wanted) {
    throw new Error(`Generated output is stale: ${path}`);
  }
}

export async function check(
  repositoryRoot = process.cwd(),
  threeRoot?: string,
  timings = false,
): Promise<string[]> {
  const root = resolve(repositoryRoot);
  const out = outputRoot(root);
  const { options, manifests } = await extractAll(root, threeRoot, timings);
  const checked: string[] = [];
  for (const option of options) {
    const path = manifestPath(out, option);
    if (!existsSync(path)) {
      throw new Error(`Missing generated manifest: ${path}`);
    }
    checkFile(path, manifests.get(option.surface));
    checked.push(path);
  }
  const easelOption = options.find((item) => item.surface === "easel");
  const easel = manifests.get("easel");
  if (!(easelOption && easel)) {
    throw new Error("EASEL manifest was not generated");
  }
  const threeManifests = [
    "three-core",
    "three-addons",
    "three-webgpu",
    "three-tsl",
  ]
    .map((surface) => manifests.get(surface))
    .filter((manifest): manifest is ApiManifest => Boolean(manifest));
  validateMappingAgainstManifests(
    readMapping(resolve(root, "api-compat/mappings/three.json")),
    easel,
    threeManifests,
  );
  for (const surface of [
    "three-core",
    "three-addons",
    "three-webgpu",
    "three-tsl",
  ] as const) {
    const threeOption = options.find((item) => item.surface === surface);
    const three = manifests.get(surface);
    if (!(threeOption && three)) {
      throw new Error(`Missing ${surface} manifest`);
    }
    const report = generatedReport(
      easel,
      [three],
      resolve(root, "api-compat/mappings/three.json"),
      relative(root, manifestPath(out, easelOption)).replaceAll("\\", "/"),
      relative(root, manifestPath(out, threeOption)).replaceAll("\\", "/"),
    );
    const path = resolve(
      out,
      surface === "three-core"
        ? "compatibility.json"
        : `compatibility-${surface}.json`,
    );
    if (!existsSync(path)) {
      throw new Error(`Missing generated compatibility report: ${path}`);
    }
    checkFile(path, report);
    checked.push(path);
  }
  return checked;
}

interface LatestMetadata {
  version: string;
  tarball: string;
}
interface LatestProbe {
  schemaVersion: 1;
  generatedAt: string;
  packages: {
    name: string;
    current: string;
    latest: string;
    changed: boolean;
  }[];
  compatibility: Record<
    string,
    { before: CompatibilityReport; after: CompatibilityReport }
  >;
  upgrades: {
    easel: VersionDiffReport;
    three: Record<string, VersionDiffReport>;
  };
}

export async function probeLatest(
  repositoryRoot = process.cwd(),
): Promise<string> {
  const root = resolve(repositoryRoot);
  const packageJson = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  ) as { version: string };
  const threePackage = JSON.parse(
    readFileSync(resolve(root, "node_modules/three/package.json"), "utf8"),
  ) as { version: string };
  const names = ["@xsyetopz/easel", "three"];
  const metadata: LatestMetadata[] = [];
  for (const name of names) {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(name)}/latest`,
    );
    if (!response.ok) {
      throw new Error(
        `Latest-version probe failed for ${name}: HTTP ${response.status}`,
      );
    }
    const body = (await response.json()) as {
      version?: unknown;
      dist?: { tarball?: unknown };
    };
    if (
      typeof body.version !== "string" ||
      typeof body.dist?.tarball !== "string"
    ) {
      throw new Error(
        `Latest-version probe returned incomplete metadata for ${name}`,
      );
    }
    metadata.push({ version: body.version, tarball: body.dist.tarball });
  }
  const temp = mkdtempSync(join(tmpdir(), "easel-api-compat-"));
  try {
    const unpacked: string[] = [];
    for (const [index, item] of metadata.entries()) {
      const archive = join(temp, `${index}.tgz`);
      const response = await fetch(item.tarball);
      if (!response.ok) {
        throw new Error(
          `Latest-version probe failed downloading ${names[index]}: HTTP ${response.status}`,
        );
      }
      writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
      execFileSync("tar", ["-xzf", archive, "-C", temp]);
      const candidate = join(
        temp,
        index === 0 ? "easel-package" : "three-package",
      );
      renameSync(join(temp, "package"), candidate);
      unpacked.push(candidate);
    }
    const current = await extractAll(root);
    const candidateEasel = await extractManifest({
      packageName: names[0]!,
      packageVersion: metadata[0]?.version,
      surface: "easel",
      entrypoint: "package/src/index.ts",
      sourceRoot: join(unpacked[0]!, "src"),
      rootFile: join(unpacked[0]!, "src/index.ts"),
      packageRoot: unpacked[0],
    });
    validateManifest(candidateEasel);
    const candidateThreeOptions = defaultSurfaceOptions({
      repositoryRoot: root,
      threeRoot: unpacked[1],
      easelVersion: packageJson.version,
      threeVersion: metadata[1]?.version,
    }).filter((item) => item.surface !== "easel");
    const candidateThree = new Map<string, ApiManifest>();
    for (const candidate of await extractManifests(candidateThreeOptions)) {
      validateManifest(candidate);
      candidateThree.set(candidate.surface.id, candidate);
    }
    const mapping = readMapping(
      resolve(root, "api-compat/mappings/three.json"),
    );
    validateCompatibilityMapping(mapping);
    const compatibility: LatestProbe["compatibility"] = {};
    const upgrades: LatestProbe["upgrades"] = {
      easel: diffManifestVersions(
        current.manifests.get("easel")!,
        candidateEasel,
        {
          sourceManifestPath: "locked",
          targetManifestPath: "latest-candidate",
        },
      ),
      three: {},
    };
    for (const surface of [
      "three-core",
      "three-addons",
      "three-webgpu",
      "three-tsl",
    ] as const) {
      const beforeThree = current.manifests.get(surface);
      const afterThree = candidateThree.get(surface);
      if (!(beforeThree && afterThree)) {
        continue;
      }
      upgrades.three[surface] = diffManifestVersions(beforeThree, afterThree, {
        sourceManifestPath: "locked",
        targetManifestPath: "latest-candidate",
      });
      compatibility[surface] = {
        before: diffManifests(
          current.manifests.get("easel")!,
          beforeThree,
          mapping,
          { easelManifestPath: "locked", threeManifestPath: "locked" },
        ),
        after: diffManifests(candidateEasel, afterThree, mapping, {
          easelManifestPath: "latest-candidate",
          threeManifestPath: "latest-candidate",
        }),
      };
    }
    const probe: LatestProbe = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      packages: [
        {
          name: names[0]!,
          current: packageJson.version,
          latest: metadata[0]?.version,
          changed: packageJson.version !== metadata[0]?.version,
        },
        {
          name: names[1]!,
          current: threePackage.version,
          latest: metadata[1]?.version,
          changed: threePackage.version !== metadata[1]?.version,
        },
      ],
      compatibility,
      upgrades,
    };
    validateLatestProbe(probe);
    const out = resolve(
      root,
      argValue(process.argv.slice(2), "--output") ?? "api-compat/generated",
    );
    mkdirSync(out, { recursive: true });
    const path = resolve(out, "latest-probe.json");
    writeDeterministicJson(path, probe);
    return path;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

export async function runCli(args = process.argv.slice(2)): Promise<void> {
  const command = args[0] ?? "generate";
  const root = resolve(argValue(args, "--root") ?? process.cwd());
  const threeRoot = argValue(args, "--three-root");
  const timings = args.includes("--timings");
  if (command === "generate") {
    for (const path of await generate(root, threeRoot, timings)) {
      console.log(path);
    }
    return;
  }
  if (command === "check") {
    for (const path of await check(root, threeRoot, timings)) {
      console.log(path);
    }
    return;
  }
  if (command === "probe-latest") {
    console.log(await probeLatest(root));
    return;
  }
  throw new Error(`Unknown API compatibility command: ${command}`);
}

if (import.meta.main) {
  runCli().catch((error) => {
    console.error(
      error instanceof Error ? (error.stack ?? error.message) : error,
    );
    process.exitCode = 1;
  });
}

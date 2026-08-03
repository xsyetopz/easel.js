import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import process from "node:process";
import { diffManifests } from "../../scripts/api-compat/diff.ts";
import {
  defaultSurfaceOptions,
  extractManifest,
} from "../../scripts/api-compat/extract.ts";
import { parseMapping } from "../../scripts/api-compat/mapping.ts";
import {
  validateCompatibilityMapping,
  validateManifest,
} from "../../scripts/api-compat/validate.ts";

const root = process.cwd();

function generatedJsonFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...generatedJsonFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(path);
    }
  }
  return files;
}

describe("API compatibility schemas", () => {
  it("accepts the checked-in mapping and rejects malformed status", () => {
    const mapping = JSON.parse(
      readFileSync(`${root}/api-compat/mappings/three.json`, "utf8"),
    );
    expect(() => validateCompatibilityMapping(mapping)).not.toThrow();
    expect(() =>
      parseMapping({
        schemaVersion: 1,
        mappings: [
          {
            source: "easel:Node",
            target: "three-core:Object3D",
            status: "not-a-status",
            notes: [],
          },
        ],
      }),
    ).toThrow();
  });

  it("keeps generated artifacts independent of the checkout path", () => {
    const generated = `${root}/api-compat/generated`;
    for (const path of generatedJsonFiles(generated)) {
      const json = readFileSync(path, "utf8");
      expect(json).not.toContain(root);
    }
  });

  it("manifest schema rejects missing provenance", () => {
    const manifest = {
      schemaVersion: 1,
      manifestVersion: "1.0",
      package: { name: "x", version: "1" },
      surface: {
        id: "easel",
        name: "EASEL",
        entrypoint: "src/index.ts",
        sourceRoot: "src",
      },
      exports: [],
      symbols: [],
    };
    expect(() => validateManifest(manifest)).toThrow();
  });
});

describe("source-grounded extraction", () => {
  it("extracts a three.js JavaScript class field and method signature", async () => {
    const option = defaultSurfaceOptions({ repositoryRoot: root }).find(
      (item) => item.surface === "three-core",
    );
    expect(option).toBeDefined();
    const manifest = await extractManifest(option!);
    const object3d = manifest.symbols.find(
      (symbol) => symbol.name === "Object3D",
    );
    expect(object3d).toBeDefined();
    expect(object3d?.members.some((member) => member.name === "position")).toBe(
      true,
    );
    expect(
      object3d?.members.some(
        (member) =>
          member.name === "add" &&
          member.kind === "method" &&
          (member.signatures?.[0]?.parameters.length ?? 0) > 0,
      ),
    ).toBe(true);
  }, 120_000);
});

describe("deterministic structural diff", () => {
  it("reports renamed symbols and member signature changes", () => {
    const source = {
      schemaVersion: 1 as const,
      manifestVersion: "1.0",
      package: { name: "easel", version: "1" },
      surface: {
        id: "easel" as const,
        name: "EASEL",
        entrypoint: "src/index.ts",
        sourceRoot: "src",
      },
      exports: [],
      symbols: [
        {
          id: "easel:Node",
          name: "Node",
          kind: "class" as const,
          exportKind: "named" as const,
          typeParameters: [],
          extends: [],
          implements: [],
          constructors: [],
          signatures: [],
          members: [
            {
              name: "add",
              kind: "method" as const,
              scope: "instance" as const,
              optional: false,
              readonly: false,
              static: false,
              signatures: [
                {
                  parameters: [
                    {
                      name: "node",
                      type: "Node",
                      optional: false,
                      rest: false,
                    },
                  ],
                  returnType: "this",
                },
              ],
            },
          ],
        },
      ],
      provenance: {
        extractor: "test",
        compiler: "test",
        entrypoint: "src/index.ts",
        files: [],
      },
    };
    const sourceSymbol = source.symbols[0];
    if (!sourceSymbol) {
      throw new Error("source symbol fixture missing");
    }
    const sourceMember = sourceSymbol.members[0];
    if (!sourceMember) {
      throw new Error("source member fixture missing");
    }
    const target = {
      ...source,
      package: { name: "three", version: "1" },
      surface: {
        id: "three-core" as const,
        name: "three",
        entrypoint: "Three.js",
        sourceRoot: "src",
      },
      symbols: [
        {
          ...source.symbols[0]!,
          id: "three-core:Object3D",
          name: "Object3D",
          members: [
            {
              ...sourceMember,
              signatures: [
                {
                  parameters: [
                    {
                      name: "objects",
                      type: "Object3D[]",
                      optional: false,
                      rest: true,
                    },
                  ],
                  returnType: "this",
                },
              ],
            },
          ],
        },
      ],
      exports: [],
      provenance: {
        extractor: "test",
        compiler: "test",
        entrypoint: "Three.js",
        files: [],
      },
    };
    const report = diffManifests(source, target, {
      schemaVersion: 1,
      mappings: [
        {
          source: "easel:Node",
          target: "three-core:Object3D",
          status: "adapted",
          notes: [],
        },
      ],
    });
    expect(report.summary.renamedMatches).toBe(1);
    expect(
      report.comparisons[0]?.structural?.members.changed.length,
    ).toBeGreaterThan(0);
  });

  it("downgrades a curated target that is absent from the candidate manifest", () => {
    const source = {
      schemaVersion: 1 as const,
      manifestVersion: "1.0",
      package: { name: "easel", version: "1" },
      surface: {
        id: "easel" as const,
        name: "EASEL",
        entrypoint: "src/index.ts",
        sourceRoot: "src",
      },
      exports: [],
      symbols: [
        {
          id: "easel:Node",
          name: "Node",
          kind: "class" as const,
          exportKind: "named" as const,
          typeParameters: [],
          extends: [],
          implements: [],
          constructors: [],
          signatures: [],
          members: [],
        },
      ],
      provenance: {
        extractor: "test",
        compiler: "test",
        entrypoint: "src/index.ts",
        files: [],
      },
    };
    const target = {
      ...source,
      package: { name: "three", version: "1" },
      surface: {
        id: "three-core" as const,
        name: "three",
        entrypoint: "Three.js",
        sourceRoot: "src",
      },
      symbols: [],
      provenance: {
        extractor: "test",
        compiler: "test",
        entrypoint: "Three.js",
        files: [],
      },
    };
    const report = diffManifests(source, target, {
      schemaVersion: 1,
      mappings: [
        {
          source: "easel:Node",
          target: "three-core:RemovedNode",
          status: "adapted",
          notes: [],
        },
      ],
    });
    expect(report.comparisons[0]?.target).toBeUndefined();
    expect(report.comparisons[0]?.status).toBe("unknown");
    expect(report.comparisons[0]?.notes.join(" ")).toContain(
      "three-core:RemovedNode",
    );
  });
});

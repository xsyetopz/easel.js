import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import {
  compileCheckedInSchemas,
  compileJsonSchema,
  validateCompatibilityReport,
  validateManifest,
} from "../../scripts/api-compat/validate.ts";

const root = process.cwd();
const compatibilityPath = join(
  root,
  "api-compat",
  "generated",
  "compatibility.json",
);

function allSourceDocs(directory: string): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...allSourceDocs(path));
    } else if (entry.isFile() && path.endsWith(".ts")) {
      paths.push(path);
    }
  }
  return paths;
}

function documentedIds(directory: string): string[] {
  return allSourceDocs(directory).flatMap((path) => {
    const text = readFileSync(path, "utf8");
    return [...text.matchAll(/\bid:\s*"([^"]+)"/gu)].map((match) => match[1]!);
  });
}

function minimalManifest(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    manifestVersion: "1.0",
    package: { name: "fixture", version: "1.0.0" },
    surface: {
      id: "easel",
      name: "EASEL",
      entrypoint: "src/index.ts",
      sourceRoot: "src",
    },
    exports: [],
    symbols: [],
    provenance: {
      extractor: "fixture",
      compiler: "fixture",
      entrypoint: "src/index.ts",
      files: [],
    },
  };
}

describe("Draft 2020-12 API schemas", () => {
  it("compiles every checked-in schema and rejects unsupported vocabulary", () => {
    const validators = compileCheckedInSchemas();
    expect(validators.has("api-manifest.schema.json")).toBe(true);
    expect(validators.has("compatibility-mapping.schema.json")).toBe(true);
    expect(validators.has("diff-report.schema.json")).toBe(true);

    expect(() =>
      compileJsonSchema(
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "string",
          format: "not-a-registered-format",
        },
        "unsupported-format-fixture",
      ),
    ).toThrow(/unknown format/u);
    expect(() =>
      compileJsonSchema(
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "string",
          "not-a-json-schema-keyword": true,
        },
        "unsupported-keyword-fixture",
      ),
    ).toThrow(/unknown keyword/u);
  });

  it("enforces real schema keywords instead of a hand-written subset", () => {
    const validator = compileJsonSchema(
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 3, pattern: "^[A-Z]" },
        },
      },
      "keyword-fixture",
    );
    expect(validator({ name: "Easel" })).toBe(true);
    expect(validator({ name: "no" })).toBe(false);
    expect(validator({ name: "Easel", extra: true })).toBe(false);
  });

  it("rejects malformed manifest artifacts", () => {
    const manifest = minimalManifest();
    expect(() => validateManifest(manifest)).not.toThrow();
    expect(() =>
      validateManifest({ ...manifest, provenance: undefined }),
    ).toThrow(/provenance/u);
    expect(() => validateManifest({ ...manifest, unexpected: true })).toThrow(
      /unexpected/u,
    );
  });

  it("rejects malformed generated compatibility artifacts", () => {
    const report = JSON.parse(
      readFileSync(compatibilityPath, "utf8"),
    ) as Record<string, unknown>;
    expect(() => validateCompatibilityReport(report)).not.toThrow();
    const malformed = { ...report };
    delete malformed["summary"];
    expect(() => validateCompatibilityReport(malformed)).toThrow(/summary/u);
  });
});

describe("generated API documentation contract", () => {
  it("maps every documented class and contains no legacy equivalence metadata", () => {
    const report = JSON.parse(readFileSync(compatibilityPath, "utf8")) as {
      comparisons: Array<{ source: { id: string } }>;
    };
    const mappedIds = new Set(
      report.comparisons.map((mapping) => mapping.source.id),
    );
    for (const id of documentedIds(join(root, "www", "docs", "classes"))) {
      expect(mappedIds.has(`easel:${id}`)).toBe(true);
    }
    for (const source of allSourceDocs(join(root, "www", "docs", "classes"))) {
      const text = readFileSync(source, "utf8");
      expect(text).not.toMatch(/threeEquivalent|divergence/u);
    }
  });

  it("renders compatibility sections with valid Markdown structure and CPU notes", () => {
    execFileSync("bun", ["scripts/generate-starlight-docs.mjs"], {
      cwd: root,
      stdio: "pipe",
    });
    const renderer = readFileSync(
      join(
        root,
        "www",
        "astro",
        "content",
        "docs",
        "docs",
        "core",
        "Renderer.md",
      ),
      "utf8",
    );
    expect(renderer).toContain("**THREE.js equivalent:**");
    expect(renderer).toContain("\n\n**Compatibility:**");
    expect(renderer).toMatch(/Canvas2D/u);
    expect(renderer).toMatch(/CPU/u);
    expect(renderer).not.toMatch(/[^\n]\n\*\*Compatibility:\*\*/u);
    const orbitControls = readFileSync(
      join(
        root,
        "www",
        "astro",
        "content",
        "docs",
        "docs",
        "controls",
        "OrbitControls.md",
      ),
      "utf8",
    );
    expect(orbitControls).toContain("`THREE.OrbitControls`");
    expect(orbitControls).toContain("**Compatibility:** `adapted`");
  });
});

import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { generateSourceDocs } from "../../scripts/generate-starlight-docs.ts";
import { CATEGORY_NAMES } from "../../scripts/starlight-docs/api-model.ts";

const root = `${import.meta.dir}/../..`;

describe("generate-starlight-docs", () => {
  it("generates one deterministic page for every source export", () => {
    const first = generateSourceDocs();
    const second = generateSourceDocs();

    expect([...first]).toEqual([...second]);
    expect(first.size).toBeGreaterThan(300);
    expect(first.get("index.md")).toContain(
      "generated from the public exports in `src/index.ts`",
    );
  });

  it("documents classes, records, functions, constants, and pipeline types", () => {
    const docs = generateSourceDocs();

    expect(docs.get("math/SphericalHarmonics3.md")).toContain(
      "`radianceAt(normal: Readonly<Vector3>, target: Vector3): Vector3`",
    );
    expect(docs.get("animation/AnimationClipJSON.md")).toContain(
      "interface AnimationClipJSON",
    );
    expect(docs.get("math/clamp.md")).toContain("function clamp");
    expect(docs.get("math/multiplyQuaternionsFlat.md")).toContain(
      "without creating Quaternion objects",
    );
    expect(docs.get("lights/LightProbe.md")).toContain(
      "Diffuse environment lighting evaluated only during flat or Gouraud baking",
    );
    expect(docs.get("math/SphericalHarmonicsBasis-type.md")).toContain(
      "type SphericalHarmonicsBasis",
    );
    expect(docs.get("math/sphericalHarmonicsBasis-function.md")).toContain(
      "function sphericalHarmonicsBasis",
    );
    expect(docs.get("core/REVISION.md")).toContain("const REVISION:");
    expect(docs.get("pipeline/LightBaker.md")).toContain(
      "Generated from `src/pipeline/shading/LightBaker.ts`",
    );
  });

  it("keeps every generated API category in the Starlight sidebar", () => {
    const docs = generateSourceDocs();
    const generatedCategories = new Set(
      [...docs.keys()]
        .filter((key) => key !== "index.md")
        .map((key) => key.slice(0, key.indexOf("/"))),
    );
    const config = readFileSync(`${root}/astro.config.mjs`, "utf8");
    const sidebarStart = config.indexOf("const apiSidebarGroups");
    const sidebarEnd = config.indexOf("const manualSidebar");
    const apiSidebar = config.slice(sidebarStart, sidebarEnd);
    const labelsBySlug = new Map(
      Object.values(CATEGORY_NAMES).map((label) => [
        label.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-"),
        label,
      ]),
    );

    for (const category of generatedCategories) {
      const label = labelsBySlug.get(category);
      expect(label).toBeDefined();
      if (label === undefined) continue;
      expect(apiSidebar).toContain(`  "${label}",`);
    }
  });

  it("has no hand-maintained API catalog", () => {
    expect(existsSync(`${root}/www/docs`)).toBe(false);
    expect(existsSync(`${root}/scripts/generate-starlight-docs.mjs`)).toBe(
      false,
    );
  });
});

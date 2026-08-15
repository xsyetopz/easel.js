import { describe, expect, it } from "bun:test";

import { categoryLabels, examples } from "../../www/examples/registry.ts";

describe("EASEL.js example catalog", () => {
  it("uses the registry as the canonical catalog", () => {
    expect(examples.length).toBeGreaterThan(0);

    const ids = examples.map((example) => example.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("data-texture-review");
    expect(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id))).toBe(
      true,
    );
    expect(
      examples.every((example) =>
        Object.hasOwn(categoryLabels, example.meta.category),
      ),
    ).toBe(true);
    expect(
      examples.every((example) => example.meta.description.length > 40),
    ).toBe(true);
    expect(examples.every((example) => example.meta.animated)).toBe(true);
    expect(
      examples.some((example) => example.meta.id.includes("buffergeometry")),
    ).toBe(false);
  });

  it("keeps deterministic task-oriented category labels", () => {
    expect(Object.keys(categoryLabels)).toEqual([
      "motion",
      "worlds",
      "interaction",
      "materials",
      "geometry",
      "assets",
      "data",
    ]);
  });

  it("keeps every source panel syntactically valid", async () => {
    for (const example of examples) {
      const module = await example.load();
      expect(module.easelSource).toContain("@xsyetopz/easel");
      expect(module.easelSource).not.toMatch(/three|webgl|webgpu/iu);
      expect(module.easelSource).not.toMatch(
        /HDRLoader|VertexNormalsHelper|VertexTangentsHelper/u,
      );
      const source = module.easelSource.replace(/^import[^\n]*\n/gm, "");
      expect(() => new Function(source)).not.toThrow();
    }
  });

  it("models every continuously rendered scene as pausable animation", () => {
    expect(examples.filter((example) => example.meta.animated)).toHaveLength(
      examples.length,
    );
    expect(
      examples.every(
        (example) => typeof example.load === "function" && example.controls,
      ),
    ).toBe(true);
  });

  it("lazy-loads the module represented by every catalog entry", async () => {
    for (const entry of examples) {
      const module = await entry.load();
      expect(module.meta).toEqual(entry.meta);
      expect(module.controls ?? []).toEqual(entry.controls);
      expect(typeof module.setup).toBe("function");
    }
  });
});

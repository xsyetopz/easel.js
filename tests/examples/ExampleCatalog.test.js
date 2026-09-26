import { describe, expect, it } from "bun:test";

import { categoryLabels, examples } from "../../www/examples/registry.ts";

// three.js r186 examples/files.json category order, with webgl renamed canvas.
const THREE_CATEGORY_ORDER = ["canvas", "webaudio", "physics", "misc"];

describe("EASEL.js example catalog", () => {
  it("mirrors three.js example ids and categories", () => {
    for (const { meta } of examples) {
      const expected = meta.upstream.startsWith("webgl_")
        ? `canvas_${meta.upstream.slice("webgl_".length)}`
        : meta.upstream;
      expect(meta.id).toBe(expected);
    }
    expect(examples.length).toBeGreaterThan(0);

    const ids = examples.map((example) => example.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z0-9]+(?:_[a-z0-9]+)*$/u.test(id))).toBe(
      true,
    );
    expect(
      examples.every((example) =>
        example.meta.id.startsWith(`${example.meta.category}_`),
      ),
    ).toBe(true);
    expect(
      examples.every((example) => example.meta.description.length > 40),
    ).toBe(true);
    expect(
      examples.every((example) => Array.isArray(example.meta.differences)),
    ).toBe(true);
  });

  it("orders category labels as three.js does and uses each one", () => {
    const labels = Object.keys(categoryLabels);
    expect(labels).toEqual(
      THREE_CATEGORY_ORDER.filter((category) => labels.includes(category)),
    );
    const used = new Set(examples.map((example) => example.meta.category));
    expect(labels.every((category) => used.has(category))).toBe(true);
  });

  it("keeps every source panel syntactically valid", async () => {
    for (const example of examples) {
      const module = await example.load();
      expect(module.easelSource).toContain("@xsyetopz/easel");
      const source = module.easelSource.replace(/^import[^\n]*\n/gm, "");
      expect(() => new Function(source)).not.toThrow();
    }
  });

  it("lazy-loads the EASEL port and the three.js original of every entry", async () => {
    for (const entry of examples) {
      const module = await entry.load();
      expect(module.meta).toEqual(entry.meta);
      expect(module.controls ?? []).toEqual(entry.controls);
      expect(typeof module.setup).toBe("function");
      const original = await entry.loadThree();
      expect(typeof original.setup).toBe("function");
    }
  });
});

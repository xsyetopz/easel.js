import { describe, expect, it } from "bun:test";
import { ColorTable } from "@/pipeline/color/ColorTable.js";
import { Hsl16 } from "@/pipeline/color/Hsl16.ts";

describe("ColorTable", () => {
  it("constructs without throwing", () => {
    expect(() => new ColorTable()).not.toThrow();
  });

  it("lookup(BLACK) returns {r:0, g:0, b:0}", () => {
    const table = new ColorTable();
    const { r, g, b } = table.lookup(Hsl16.BLACK);
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it("lookup(WHITE) returns near {r:255, g:255, b:255}", () => {
    const table = new ColorTable();
    const { r, g, b } = table.lookup(Hsl16.WHITE);
    expect(r).toBeGreaterThan(250);
    expect(g).toBeGreaterThan(250);
    expect(b).toBeGreaterThan(250);
  });

  it("pure red HSL(0, 1, 0.5) returns R≈255, G≈0, B≈0", () => {
    const table = new ColorTable();
    const hsl = Hsl16.encode(0, 1, 0.5);
    const { r, g, b } = table.lookup(hsl);
    expect(r).toBeGreaterThan(240);
    expect(g).toBeLessThan(20);
    expect(b).toBeLessThan(20);
  });

  it("returns an object with r, g, b fields", () => {
    const table = new ColorTable();
    const result = table.lookup(Hsl16.encode(0.3, 0.5, 0.5));
    expect(result).toHaveProperty("r");
    expect(result).toHaveProperty("g");
    expect(result).toHaveProperty("b");
  });
});

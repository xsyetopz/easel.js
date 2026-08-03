import { describe, expect, it } from "bun:test";
import { Fog } from "@/scenes/Fog.js";

describe("Fog", () => {
  it("lut[0] is 0 (no fog at near)", () => {
    const fog = new Fog();
    expect(fog.lut[0]).toBeCloseTo(0, 6);
  });

  it("lut[255] approaches 1 at default density", () => {
    const fog = new Fog(); // density=2.5 → 1-exp(-6.25) ≈ 0.998
    expect(fog.lut[255]).toBeGreaterThan(0.99);
  });

  it("lut is monotonically non-decreasing", () => {
    const fog = new Fog();
    for (let i = 1; i < 256; i++) {
      expect(fog.lut[i]).toBeGreaterThanOrEqual(fog.lut[i - 1]);
    }
  });

  it("rebuilds lut when density changes", () => {
    const fog = new Fog({ density: 0.5 });
    const low = fog.lut[128];
    fog.density = 2.5;
    expect(fog.lut[128]).toBeGreaterThan(low);
  });

  it("near/far do not affect lut shape", () => {
    const a = new Fog({ near: 0, far: 100, density: 2.5 });
    const b = new Fog({ near: 50, far: 500, density: 2.5 });
    for (let i = 0; i < 256; i++) {
      expect(a.lut[i]).toBeCloseTo(b.lut[i], 6);
    }
  });

  it("clone preserves density", () => {
    const fog = new Fog({ near: 10, far: 200, density: 1.5 });
    const c = fog.clone();
    expect(c.density).toBe(1.5);
    expect(c.near).toBe(10);
    expect(c.far).toBe(200);
  });

  it("clone lut matches original", () => {
    const fog = new Fog({ density: 1.8 });
    const c = fog.clone();
    for (let i = 0; i < 256; i++) {
      expect(c.lut[i]).toBeCloseTo(fog.lut[i], 6);
    }
  });
});

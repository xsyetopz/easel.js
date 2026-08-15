import { describe, expect, it } from "bun:test";
import { TorusKnotGeometry } from "../../../src/geometry/primitives/TorusKnotGeometry.ts";
import { defined } from "../../_helpers/defined.ts";

describe("TorusKnotGeometry", () => {
  it("generates expected vertex count", () => {
    const geo = new TorusKnotGeometry(1, 0.4, 64, 8);
    const pos = defined(geo.getAttribute("position"));
    expect(pos.array.length / pos.itemSize).toBe((64 + 1) * (8 + 1));
  });

  it("has no NaN in positions", () => {
    const geo = new TorusKnotGeometry(1, 0.4, 64, 8);
    const pos = defined(geo.getAttribute("position"));
    for (const val of pos.array) {
      expect(Number.isNaN(val)).toBe(false);
    }
  });

  it("has no NaN in normals", () => {
    const geo = new TorusKnotGeometry(1, 0.4, 64, 8);
    const nrm = defined(geo.getAttribute("normal"));
    for (const val of nrm.array) {
      expect(Number.isNaN(val)).toBe(false);
    }
  });

  it("normals are unit length", () => {
    const geo = new TorusKnotGeometry(1, 0.4, 64, 8);
    const nrm = defined(geo.getAttribute("normal"));
    for (let i = 0; i < nrm.array.length; i += 3) {
      const len = Math.sqrt(
        nrm.array[i] ** 2 + nrm.array[i + 1] ** 2 + nrm.array[i + 2] ** 2,
      );
      expect(len).toBeCloseTo(1, 3);
    }
  });

  it("has index buffer", () => {
    const geo = new TorusKnotGeometry(1, 0.4, 64, 8);
    expect(geo.index).toBeDefined();
    expect(defined<Uint16Array | Uint32Array>(geo.index).length).toBe(
      64 * 8 * 6,
    );
  });
});

describe("TorusKnotGeometry winding order", () => {
  it("vertex normals dot with position-from-path-center > 0", () => {
    // Use low segments so tube cross-section is simple
    const radius = 1;
    const tube = 0.4;
    const p = 2;
    const q = 3;
    const ts = 32;
    const rs = 6;
    const geo = new TorusKnotGeometry(radius, tube, ts, rs, p, q);
    const pos = defined(geo.getAttribute("position")).array;
    const nrm = defined(geo.getAttribute("normal")).array;

    // Recompute path centers to verify normals point outward from tube
    let outward = 0;
    let total = 0;
    for (let i = 0; i <= ts; i++) {
      const u = (i / ts) * p * Math.PI * 2;
      const quOverP = q / p;
      const r = 0.5 * (2 + Math.cos(quOverP * u));
      const cx = r * Math.cos(u) * radius;
      const cy = r * Math.sin(u) * radius;
      const cz = Math.sin(quOverP * u) * radius * 0.5;

      for (let j = 0; j <= rs; j++) {
        const vi = (i * (rs + 1) + j) * 3;
        const dx = pos[vi] - cx;
        const dy = pos[vi + 1] - cy;
        const dz = pos[vi + 2] - cz;
        const dot = nrm[vi] * dx + nrm[vi + 1] * dy + nrm[vi + 2] * dz;
        if (dot > 0) outward++;
        total++;
      }
    }

    expect(outward / total).toBeGreaterThan(0.99);
  });
});

import { describe, expect, it } from "bun:test";
import { NURBSCurve } from "@/curves/NURBSCurve.js";
import { NURBSSurface } from "@/curves/NURBSSurface.js";
import { NURBSVolume } from "@/curves/NURBSVolume.js";
import { ParametricGeometry } from "@/geometry/primitives/ParametricGeometry.js";
import { Vector3 } from "@/math/Vector3.js";

describe("NURBSCurve", () => {
  it("evaluates a clamped linear curve", () => {
    const curve = new NURBSCurve(
      1,
      [0, 0, 1, 1],
      [new Vector3(0, 0, 0), new Vector3(2, 0, 0)],
    );
    expect(curve.getPoint(0)).toMatchObject({ x: 0, y: 0, z: 0 });
    expect(curve.getPoint(0.5)).toMatchObject({ x: 1, y: 0, z: 0 });
    expect(curve.getPoint(1)).toMatchObject({ x: 2, y: 0, z: 0 });
    expect(curve.getTangent(0.5)).toMatchObject({ x: 1, y: 0, z: 0 });
  });

  it("preserves rational weights", () => {
    const curve = new NURBSCurve(
      2,
      [0, 0, 0, 1, 1, 1],
      [
        { x: 0, y: 0, z: 0, w: 1 },
        { x: 1, y: 1, z: 0, w: Math.SQRT1_2 },
        { x: 2, y: 0, z: 0, w: 1 },
      ],
    );
    const midpoint = curve.getPoint(0.5);
    expect(midpoint.x).toBeCloseTo(1, 6);
    expect(midpoint.y).toBeCloseTo(0.414214, 5);
  });

  it("round-trips JSON without sharing control points", () => {
    const curve = new NURBSCurve(
      1,
      [0, 0, 1, 1],
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    );
    const restored = new NURBSCurve(1, [0, 0, 1, 1], []).fromJSON(
      curve.toJSON(),
    );
    expect(restored.getPoint(0.5)).toMatchObject({ x: 0.5, y: 0.5, z: 0 });
    restored.controlPoints[0].x = 10;
    expect(curve.controlPoints[0].x).toBe(0);
  });
});

describe("NURBSSurface", () => {
  it("evaluates a bilinear surface", () => {
    const surface = new NURBSSurface(
      1,
      1,
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [
        [
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 },
        ],
        [
          { x: 1, y: 0, z: 0 },
          { x: 1, y: 1, z: 1 },
        ],
      ],
    );
    const point = surface.getPoint(0.5, 0.5);
    expect(point.x).toBeCloseTo(0.5, 6);
    expect(point.y).toBeCloseTo(0.5, 6);
    expect(point.z).toBeCloseTo(0.25, 6);
  });
});

describe("ParametricGeometry", () => {
  it("samples vertices, normals, UVs, and indexed triangles", () => {
    const geometry = new ParametricGeometry(
      (u, v, target) => target.set(u, v, 0),
      2,
      3,
    );
    expect(geometry.getAttribute("position")?.count).toBe(12);
    expect(geometry.getAttribute("normal")?.count).toBe(12);
    expect(geometry.getAttribute("uv")?.count).toBe(12);
    expect(geometry.index?.length).toBe(36);
  });
});

describe("NURBSCurve parity with three.js addon", () => {
  it("matches rational curve points and tangents", async () => {
    const [{ NURBSCurve: THREECurve }, THREE] = await Promise.all([
      import("three/addons/curves/NURBSCurve.js"),
      import("three"),
    ]);
    const degree = 2;
    const knots = [0, 0, 0, 1, 1, 1];
    const points = [
      { x: -1, y: 0, z: 0, w: 1 },
      { x: 0, y: 1, z: 0, w: 0.5 },
      { x: 1, y: 0, z: 0, w: 1 },
    ];
    const easel = new NURBSCurve(degree, knots, points);
    const threeCurve = new THREECurve(
      degree,
      knots,
      points.map(
        (point) => new THREE.Vector4(point.x, point.y, point.z, point.w),
      ),
    );
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const a = easel.getPoint(t);
      const b = threeCurve.getPoint(t);
      expect(a.x).toBeCloseTo(b.x, 6);
      expect(a.y).toBeCloseTo(b.y, 6);
      expect(a.z).toBeCloseTo(b.z, 6);
      const ta = easel.getTangent(t);
      const tb = threeCurve.getTangent(t);
      expect(ta.x).toBeCloseTo(tb.x, 5);
      expect(ta.y).toBeCloseTo(tb.y, 5);
      expect(ta.z).toBeCloseTo(tb.z, 5);
    }
  });
});

describe("NURBSSurface parity with three.js addon", () => {
  it("matches rational surface points", async () => {
    const [{ NURBSSurface: THREESurface }, THREE] = await Promise.all([
      import("three/addons/curves/NURBSSurface.js"),
      import("three"),
    ]);
    const degree1 = 2;
    const degree2 = 2;
    const knots1 = [0, 0, 0, 1, 1, 1];
    const knots2 = [0, 0, 0, 1, 1, 1];
    const points = [
      [
        { x: -1, y: -1, z: 0, w: 1 },
        { x: -1, y: 0, z: 1, w: 1 },
        { x: -1, y: 1, z: 0, w: 1 },
      ],
      [
        { x: 0, y: -1, z: 1, w: 1 },
        { x: 0, y: 0, z: 2, w: 0.5 },
        { x: 0, y: 1, z: 1, w: 1 },
      ],
      [
        { x: 1, y: -1, z: 0, w: 1 },
        { x: 1, y: 0, z: 1, w: 1 },
        { x: 1, y: 1, z: 0, w: 1 },
      ],
    ];
    const easel = new NURBSSurface(degree1, degree2, knots1, knots2, points);
    const threeSurface = new THREESurface(
      degree1,
      degree2,
      knots1,
      knots2,
      points.map((row) =>
        row.map(
          (point) => new THREE.Vector4(point.x, point.y, point.z, point.w),
        ),
      ),
    );
    for (const [u, v] of [
      [0.1, 0.2],
      [0.5, 0.5],
      [0.9, 0.8],
    ]) {
      const a = easel.getPoint(u, v);
      const b = new THREE.Vector3();
      threeSurface.getPoint(u, v, b);
      expect(a.x).toBeCloseTo(b.x, 6);
      expect(a.y).toBeCloseTo(b.y, 6);
      expect(a.z).toBeCloseTo(b.z, 6);
    }
  });
});

describe("NURBSVolume", () => {
  it("evaluates and clones a trilinear volume", () => {
    const volume = new NURBSVolume(
      1,
      1,
      1,
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [
        [
          [
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 },
          ],
        ],
        [
          [
            { x: 1, y: 0, z: 0 },
            { x: 1, y: 0, z: 1 },
          ],
        ],
      ],
    );
    const point = volume.getPoint(0.5, 0, 0.5);
    expect(point.x).toBeCloseTo(0.5, 6);
    expect(point.z).toBeCloseTo(0.5, 6);
    expect(volume.clone().getPoint(0.5, 0, 0.5)).toMatchObject({
      x: 0.5,
      z: 0.5,
    });
  });
});

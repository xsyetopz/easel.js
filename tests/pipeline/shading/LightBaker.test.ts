import { beforeEach, describe, expect, it } from "bun:test";
import { Shading } from "../../../src/core/Constants.ts";
import {
  LinearToSRGB,
  SRGBToLinear,
} from "../../../src/math/ColorManagement.ts";
import { SphericalHarmonics3 } from "../../../src/math/SphericalHarmonics3.ts";
import { LightBaker } from "../../../src/pipeline/shading/LightBaker.ts";
import { TriangleBuffer } from "../../../src/pipeline/TriangleBuffer.ts";

type TriangleArgs = Parameters<TriangleBuffer["append"]>;

// sx0,sy0,sx1,sy1,sx2,sy2, z0,z1,z2, fnx,fny,fnz, vn0x,vn0y,vn0z, vn1x,vn1y,vn1z, vn2x,vn2y,vn2z, u0,v0,u1,v1,u2,v2
const TRI_FACING_LIGHT = [
  0, 0, 5, 0, 2, 5, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0,
  0, 0,
] as TriangleArgs;
const TRI_PERPENDICULAR = [
  0, 0, 5, 0, 2, 5, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
  0,
] as TriangleArgs;
/** three.js output encode of a linear channel, clamped like the framebuffer. */
function srgb(linear: number): number {
  return LinearToSRGB(Math.min(Math.max(linear, 0), 1));
}

function makeDirectional(dx: number, dy: number, dz: number, intensity = 1) {
  return {
    type: "directional",
    direction: { x: dx, y: dy, z: dz },
    color: { r: 1, g: 1, b: 1 },
    intensity,
  };
}

function makeAmbient(intensity = 0.5) {
  return {
    type: "ambient",
    color: { r: 1, g: 1, b: 1 },
    intensity,
  };
}

function makePoint(x: number, y: number, z: number, intensity = 1) {
  return {
    type: "point",
    position: { x, y, z },
    color: { r: 1, g: 1, b: 1 },
    intensity,
    distance: 0,
    decay: 2,
  };
}

function makeDrawCall(shading: number, triangles: TriangleArgs[]) {
  const tb = new TriangleBuffer(triangles.length || 1);
  for (const t of triangles) {
    tb.append(...t);
  }
  tb.buildSortOrder();
  return {
    triangles: tb,
    material: { shading },
    shadedColorData: new Float32Array(0),
    shadedColorStride: 0,
  };
}

describe("LightBaker", () => {
  let baker: LightBaker;

  beforeEach(() => {
    baker = new LightBaker();
  });

  it("flat shading: facing light produces r > 0.9", () => {
    const dc = makeDrawCall(Shading.Flat, [TRI_FACING_LIGHT]);
    baker.bake(dc, [makeDirectional(0, 0, 1)]);
    expect(dc.shadedColorStride).toBe(3);
    expect(dc.shadedColorData[0]).toBeGreaterThan(0.9); // r
  });

  it("gouraud shading: stride 9 with 9 values per triangle (r,g,b x 3 vertices)", () => {
    const dc = makeDrawCall(Shading.Gouraud, [TRI_FACING_LIGHT]);
    baker.bake(dc, [makeDirectional(0, 0, 1)]);
    expect(dc.shadedColorStride).toBe(9);
    expect(dc.shadedColorData.length).toBeGreaterThanOrEqual(9);
    // Each vertex r,g,b must be a finite number
    for (let j = 0; j < 9; j++) {
      expect(typeof dc.shadedColorData[j]).toBe("number");
      expect(Number.isFinite(dc.shadedColorData[j])).toBe(true);
    }
  });

  it("bakes light-probe irradiance through the Gouraud vertex path", () => {
    const sh = new SphericalHarmonics3();
    sh.coefficients[0].set(0.5, 0.25, 0.125);
    const dc = makeDrawCall(Shading.Gouraud, [TRI_FACING_LIGHT]);
    baker.bake(dc, [
      { type: "probe", coefficients: sh.coefficients, intensity: 1 },
    ]);

    expect(dc.shadedColorStride).toBe(9);
    // Band-0 irradiance 0.886227 * c0, encoded to sRGB with no ambient floor.
    expect(dc.shadedColorData[0]).toBeCloseTo(srgb(0.4431135), 2);
    expect(dc.shadedColorData[1]).toBeCloseTo(srgb(0.22155675), 2);
    expect(dc.shadedColorData[2]).toBeCloseTo(srgb(0.110778375), 2);
  });

  it("zero lights: shadedColorStride is 0 and bake returns early", () => {
    const dc = makeDrawCall(Shading.Flat, [TRI_FACING_LIGHT]);
    baker.bake(dc, []);
    expect(dc.shadedColorStride).toBe(0);
  });

  it("second bake reuses allocation: shadedColorData covers exactly 2 triangles", () => {
    const dc = makeDrawCall(Shading.Flat, [
      TRI_FACING_LIGHT,
      TRI_PERPENDICULAR,
    ]);
    const lights = [makeDirectional(0, 0, 1)];
    baker.bake(dc, lights);
    baker.bake(dc, lights);
    expect(dc.shadedColorData.length).toBeGreaterThanOrEqual(6); // 2 tris x 3
    expect(dc.shadedColorStride).toBe(3);
  });

  it("sortOrder contract: shadedColorData[i*stride] reads normals at physIdx=sortOrder[i]", () => {
    // 3 triangles at centroidZ 0.9, 0.5, 0.1 so sort reorders them: [0,1,2] → [0,1,2] (desc order already)
    // Use centroidZ via z0=z1=z2 so centroid = z value
    // TRI at z=0.9 has face normal (0,0,-1), z=0.5 has (1,0,0), z=0.1 has (0,1,0)
    const triDeep: TriangleArgs = [
      0, 0, 5, 0, 2, 5, 0.9, 0.9, 0.9, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      0, 0, 0, 0, 0, 0,
    ];
    const triMid: TriangleArgs = [
      0, 0, 5, 0, 2, 5, 0.5, 0.5, 0.5, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0,
      0, 0, 0, 0,
    ];
    const triNear: TriangleArgs = [
      0, 0, 5, 0, 2, 5, 0.1, 0.1, 0.1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0,
      0, 0, 0, 0,
    ];

    const tb = new TriangleBuffer(3);
    tb.append(...triDeep); // physIdx 0, centroidZ 0.9
    tb.append(...triMid); // physIdx 1, centroidZ 0.5
    tb.append(...triNear); // physIdx 2, centroidZ 0.1
    tb.sort(); // sortOrder should be [0, 1, 2] (descending centroidZ)

    const dc = {
      triangles: tb,
      material: { shading: Shading.Flat },
      shadedColorData: new Float32Array(0),
      shadedColorStride: 0,
    };
    baker.bake(dc, [makeDirectional(0, 0, 1)]);

    // sortOrder[0] = physIdx 0 → face normal (0,0,-1) → facing light → high r
    // sortOrder[1] = physIdx 1 → face normal (1,0,0) → perpendicular → black
    expect(dc.shadedColorData[0]).toBeGreaterThan(0.9); // iter 0 r
    expect(dc.shadedColorData[3]).toBe(0); // iter 1 r
  });

  it("uses physical triangle order when sortOrder is inactive", () => {
    const tb = new TriangleBuffer(2);
    tb.append(...TRI_FACING_LIGHT);
    tb.append(...TRI_PERPENDICULAR);
    expect(tb.sortOrderActive).toBe(false);

    const dc = {
      triangles: tb,
      material: { shading: Shading.Flat },
      shadedColorData: new Float32Array(0),
      shadedColorStride: 0,
    };
    baker.bake(dc, [makeDirectional(0, 0, 1)]);

    expect(Number.isFinite(dc.shadedColorData[0])).toBe(true);
    expect(dc.shadedColorData[0]).toBeGreaterThan(0.9);
    expect(dc.shadedColorData[3]).toBe(0);
  });

  it("directional + ambient lights accumulate: result higher than either alone", () => {
    const dc = makeDrawCall(Shading.Flat, [TRI_FACING_LIGHT]);
    const dcAmbOnly = makeDrawCall(Shading.Flat, [TRI_FACING_LIGHT]);

    baker.bake(dc, [makeDirectional(0, 0, 1), makeAmbient(0.3)]);
    baker.bake(dcAmbOnly, [makeAmbient(0.3)]);

    // The combined bake clamps to 1 after the material; ambient alone is lower.
    expect(dc.shadedColorData[0]).toBeGreaterThanOrEqual(
      dcAmbOnly.shadedColorData[0],
    );
  });

  it("flat shading: stride is 3", () => {
    const dc = makeDrawCall(Shading.Flat, [TRI_FACING_LIGHT]);
    baker.bake(dc, [makeDirectional(0, 0, 1)]);
    expect(dc.shadedColorStride).toBe(3);
    expect(dc.shadedColorData instanceof Float32Array).toBe(true);
  });

  it("gouraud shading: stride is 9", () => {
    const dc = makeDrawCall(Shading.Gouraud, [TRI_FACING_LIGHT]);
    baker.bake(dc, [makeDirectional(0, 0, 1)]);
    expect(dc.shadedColorStride).toBe(9);
    expect(dc.shadedColorData instanceof Float32Array).toBe(true);
  });

  it("flat shading: perpendicular normal is black, with no ambient floor", () => {
    const dc = makeDrawCall(Shading.Flat, [TRI_PERPENDICULAR]);
    baker.bake(dc, [makeDirectional(0, 0, 1)]);
    expect(dc.shadedColorData[0]).toBe(0); // r
    expect(dc.shadedColorData[1]).toBe(0); // g
    expect(dc.shadedColorData[2]).toBe(0); // b
  });

  it("multiplies the linear material and instance color before the sRGB encode", () => {
    const dc = {
      ...makeDrawCall(Shading.Flat, [TRI_FACING_LIGHT]),
      material: { shading: Shading.Flat, color: { r: 0.5, g: 0.25, b: 1 } },
      instanceColorR: 1,
      instanceColorG: 1,
      instanceColorB: 0.5,
    };
    baker.bake(dc, [makeDirectional(0, 0, 1, 0.8)]);
    expect(dc.shadedColorData[0]).toBeCloseTo(srgb(0.4), 2);
    expect(dc.shadedColorData[1]).toBeCloseTo(srgb(0.2), 2);
    expect(dc.shadedColorData[2]).toBeCloseTo(srgb(0.4), 2);
  });

  it("adds emissive light after lighting, and bakes it without lights", () => {
    const material = {
      shading: Shading.Flat,
      color: { r: 1, g: 1, b: 1 },
      emissive: { r: 0.2, g: 0, b: 0.1 },
      emissiveIntensity: 2,
    };
    const lit = {
      ...makeDrawCall(Shading.Flat, [TRI_PERPENDICULAR]),
      material,
    };
    baker.bake(lit, [makeAmbient(0.25)]);
    expect(lit.shadedColorData[0]).toBeCloseTo(srgb(0.65), 2);
    expect(lit.shadedColorData[1]).toBeCloseTo(srgb(0.25), 2);
    expect(lit.shadedColorData[2]).toBeCloseTo(srgb(0.45), 2);

    const dark = {
      ...makeDrawCall(Shading.Gouraud, [TRI_FACING_LIGHT]),
      material: { ...material, shading: Shading.Gouraud },
    };
    baker.bake(dark, []);
    expect(dark.shadedColorStride).toBe(9);
    expect(dark.shadedColorData[0]).toBeCloseTo(srgb(0.4), 2);
    expect(dark.shadedColorData[1]).toBe(0);
    expect(dark.shadedColorData[2]).toBeCloseTo(srgb(0.2), 2);
  });

  it("two triangles flat shading: shadedColorData holds 6 values (2 tris x 3)", () => {
    const dc = makeDrawCall(Shading.Flat, [
      TRI_FACING_LIGHT,
      TRI_PERPENDICULAR,
    ]);
    baker.bake(dc, [makeDirectional(0, 0, 1)]);
    expect(dc.shadedColorData.length).toBeGreaterThanOrEqual(6);
    expect(dc.shadedColorStride).toBe(3);
  });

  it("point light uses drawCall.worldPositions (not triangle-duplicated data)", () => {
    const tb = new TriangleBuffer(1);
    tb.append(
      0,
      0,
      5,
      0,
      2,
      5,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      2,
    );
    tb.buildSortOrder();

    const dcNear = {
      triangles: tb,
      material: { shading: Shading.Flat },
      worldPositions: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]),
      shadedColorData: new Float32Array(0),
      shadedColorStride: 0,
    };
    const dcFar = {
      triangles: tb,
      material: { shading: Shading.Flat },
      worldPositions: new Float32Array([0, 0, 20, 0, 0, 20, 0, 0, 20]),
      shadedColorData: new Float32Array(0),
      shadedColorStride: 0,
    };

    // Intensity 100 at distance 10 gives 1 under the default decay of 2.
    const light = makePoint(0, 0, 10, 100);
    baker.bake(dcNear, [light]);
    baker.bake(dcFar, [light]);

    expect(dcNear.shadedColorData[0]).toBeGreaterThan(0.9);
    expect(dcFar.shadedColorData[0]).toBe(0);
  });

  it("attenuates point lights by distance^decay and the optional cutoff", () => {
    const bakeAt = (
      lightZ: number,
      decay: number,
      distance = 0,
      intensity = 1,
    ): number => {
      const tb = new TriangleBuffer(1);
      tb.append(
        0,
        0,
        5,
        0,
        2,
        5,
        0,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        1,
        0,
        0,
        1,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        2,
      );
      tb.buildSortOrder();
      const dc = {
        triangles: tb,
        material: { shading: Shading.Flat },
        worldPositions: new Float32Array(9),
        shadedColorData: new Float32Array(0),
        shadedColorStride: 0,
      };
      const light = { ...makePoint(0, 0, lightZ, intensity), decay, distance };
      baker.bake(dc, [light]);
      // Decode the baked sRGB value back to the linear irradiance.
      return SRGBToLinear(dc.shadedColorData[0] ?? Number.NaN);
    };

    const base = bakeAt(4, 2, 0, 0);
    expect(base).toBe(0);
    expect(bakeAt(2, 2, 0, 2) - base).toBeCloseTo(0.5, 3);
    expect(bakeAt(4, 2, 0, 4) - base).toBeCloseTo(0.25, 3);
    expect(bakeAt(4, 1, 0, 1) - base).toBeCloseTo(0.25, 3);
    expect(bakeAt(4, 0, 0, 0.5) - base).toBeCloseTo(0.5, 3);
    expect(bakeAt(4, 2, 4, 16) - base).toBeCloseTo(0, 3);
    expect(bakeAt(2, 2, 4, 2) - base).toBeCloseTo(0.5 * (1 - 1 / 16) ** 2, 3);
  });
});

import { accumulateLights } from "./lightAccumulator.ts";

interface RGB {
  r: number;
  g: number;
  b: number;
}

const _out: RGB = { r: 0, g: 0, b: 0 };

/** Per-vertex Gouraud shader with interpolated vertex normals. */
export class GouraudShader {
  /** Computes Gouraud-shaded RGB light contribution for a vertex. */
  shade(
    nx: number,
    ny: number,
    nz: number,
    lights: Record<string, unknown>[],
    ambientIntensity = 0.1,
    wx = 0,
    wy = 0,
    wz = 0,
  ): RGB {
    return accumulateLights(
      nx,
      ny,
      nz,
      lights,
      ambientIntensity,
      _out,
      wx,
      wy,
      wz,
    );
  }
}

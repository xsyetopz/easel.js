import { Vector3 } from "../math/Vector3.ts";

/** Construction options for a CPU heightfield collision shape. */
export interface HeightfieldShapeOptions {
  /** Number of samples along the local X axis. */
  readonly width: number;
  /** Number of samples along the local Z axis. */
  readonly depth: number;
  /** Height samples in row-major order (`z * width + x`). */
  readonly heights: ArrayLike<number>;
  /** Width of the sampled terrain in local units. */
  readonly sizeX?: number;
  /** Depth of the sampled terrain in local units. */
  readonly sizeZ?: number;
}

/** CPU heightfield used by terrain physics examples and rigid-body contacts. */
export class HeightfieldShape {
  /** Shape discriminator used by collision dispatch. */
  readonly type = "heightfield" as const;
  /** Number of samples along local X. */
  readonly width: number;
  /** Number of samples along local Z. */
  readonly depth: number;
  /** Width covered by the field in local units. */
  readonly sizeX: number;
  /** Depth covered by the field in local units. */
  readonly sizeZ: number;
  /** Independent row-major height storage. */
  readonly heights: Float32Array;

  /** Creates a centered, finite CPU heightfield.
   *
   * The object-form constructor is the preferred API. The positional overload
   * mirrors the compact shape setup used by physics engines:
   * `new HeightfieldShape(width, depth, heights, sizeX, sizeZ)`.
   */
  constructor(options: HeightfieldShapeOptions);
  /** Creates a centered heightfield from positional dimensions and samples. */
  constructor(
    width: number,
    depth: number,
    heights: ArrayLike<number>,
    sizeX?: number,
    sizeZ?: number,
  );
  /** Creates a heightfield from either constructor form. */
  constructor(
    optionsOrWidth: HeightfieldShapeOptions | number,
    depth?: number,
    heights?: ArrayLike<number>,
    sizeX?: number,
    sizeZ?: number,
  ) {
    const options: HeightfieldShapeOptions =
      typeof optionsOrWidth !== "number"
        ? optionsOrWidth
        : {
            width: optionsOrWidth,
            depth: depth ?? 0,
            heights: heights ?? [],
            ...(sizeX === undefined ? {} : { sizeX }),
            ...(sizeZ === undefined ? {} : { sizeZ }),
          };
    if (!Number.isSafeInteger(options.width) || options.width < 2) {
      throw new RangeError("HeightfieldShape width must be an integer >= 2.");
    }
    if (!Number.isSafeInteger(options.depth) || options.depth < 2) {
      throw new RangeError("HeightfieldShape depth must be an integer >= 2.");
    }
    const expectedLength = options.width * options.depth;
    if (options.heights.length !== expectedLength) {
      throw new RangeError(
        `HeightfieldShape heights must contain ${expectedLength} samples.`,
      );
    }
    const resolvedSizeX = options.sizeX ?? options.width - 1;
    const resolvedSizeZ = options.sizeZ ?? options.depth - 1;
    if (!Number.isFinite(resolvedSizeX) || resolvedSizeX <= 0) {
      throw new RangeError(
        "HeightfieldShape sizeX must be positive and finite.",
      );
    }
    if (!Number.isFinite(resolvedSizeZ) || resolvedSizeZ <= 0) {
      throw new RangeError(
        "HeightfieldShape sizeZ must be positive and finite.",
      );
    }
    const copy = new Float32Array(expectedLength);
    for (let index = 0; index < expectedLength; index++) {
      const value = Number(options.heights[index]);
      if (!Number.isFinite(value)) {
        throw new RangeError("HeightfieldShape heights must be finite.");
      }
      copy[index] = value;
    }
    this.width = options.width;
    this.depth = options.depth;
    this.sizeX = resolvedSizeX;
    this.sizeZ = resolvedSizeZ;
    this.heights = copy;
  }

  /** Returns an independent copy of this shape. */
  clone(): HeightfieldShape {
    return new HeightfieldShape({
      width: this.width,
      depth: this.depth,
      heights: this.heights,
      sizeX: this.sizeX,
      sizeZ: this.sizeZ,
    });
  }

  /** Whether a local X/Z point lies within the sampled field bounds. */
  containsPoint(x: number, z: number): boolean {
    return (
      Number.isFinite(x) &&
      Number.isFinite(z) &&
      x >= -this.sizeX / 2 &&
      x <= this.sizeX / 2 &&
      z >= -this.sizeZ / 2 &&
      z <= this.sizeZ / 2
    );
  }

  /** Bilinearly samples a local height, or returns `undefined` outside bounds. */
  getHeightAt(x: number, z: number): number | undefined {
    if (!this.containsPoint(x, z)) return;
    const gx = ((x + this.sizeX / 2) / this.sizeX) * (this.width - 1);
    const gz = ((z + this.sizeZ / 2) / this.sizeZ) * (this.depth - 1);
    const x0 = Math.min(this.width - 2, Math.floor(gx));
    const z0 = Math.min(this.depth - 2, Math.floor(gz));
    const tx = Math.max(0, Math.min(1, gx - x0));
    const tz = Math.max(0, Math.min(1, gz - z0));
    const row = this.width;
    const h00 = this.heights[z0 * row + x0] ?? 0;
    const h10 = this.heights[z0 * row + x0 + 1] ?? h00;
    const h01 = this.heights[(z0 + 1) * row + x0] ?? h00;
    const h11 = this.heights[(z0 + 1) * row + x0 + 1] ?? h01;
    const h0 = h00 + (h10 - h00) * tx;
    const h1 = h01 + (h11 - h01) * tx;
    return h0 + (h1 - h0) * tz;
  }

  /** Computes an upward unit normal from finite terrain differences. */
  getNormalAt(x: number, z: number, target: Vector3 = new Vector3()): Vector3 {
    const dx = this.sizeX / (this.width - 1);
    const dz = this.sizeZ / (this.depth - 1);
    const left = this.getHeightAt(x - dx, z) ?? this.getHeightAt(x, z) ?? 0;
    const right = this.getHeightAt(x + dx, z) ?? this.getHeightAt(x, z) ?? 0;
    const back = this.getHeightAt(x, z - dz) ?? this.getHeightAt(x, z) ?? 0;
    const front = this.getHeightAt(x, z + dz) ?? this.getHeightAt(x, z) ?? 0;
    return target
      .set((left - right) / (2 * dx), 1, (back - front) / (2 * dz))
      .normalize();
  }
}

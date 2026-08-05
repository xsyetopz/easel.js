/**
 * Reusable CPU segment storage for line draw calls.
 *
 * End points are pixel indices.  The rasterizer deliberately receives only
 * finite integer coordinates so the Bresenham walk has a bounded domain.
 * `sourceT` records the interpolation position in the logical segment after
 * homogeneous clipping; it lets the rasterizer evaluate vertex colours at a
 * clipped endpoint without copying geometry attributes into this buffer.
 * `dashPhase` stores the pixel-space phase at the first clipped endpoint so
 * clipping does not implicitly restart a logical segment's dash pattern.
 */
export class LineBuffer {
  #capacity: number;

  /** Number of clipped line segments currently stored. */
  length = 0;

  /** Screen-space X coordinate for each segment endpoint, in integer pixels. */
  screenX: Int32Array;
  /** Screen-space Y coordinate for each segment endpoint, in integer pixels. */
  screenY: Int32Array;
  /** Normalized-device-coordinate depth for each endpoint. */
  ndcZ: Float32Array;
  /** Per-endpoint fog blend factor; 0 is clear and 1 is fully fogged. */
  fogFactor: Float32Array;
  /** Source geometry vertex index for each endpoint. */
  vertexIndex: Uint32Array;
  /** Source-segment interpolation parameter in [0, 1]. */
  sourceT: Float32Array;
  /** Distance along the source line used for dash-pattern selection. */
  dashPhase: Float32Array;
  /** Whether this segment continues the previous clipped segment. */
  continuesPrevious: Uint8Array;

  /** Constructs clipped-segment storage with an optional initial capacity. */
  constructor(initialCapacity = 0) {
    if (!Number.isInteger(initialCapacity) || initialCapacity < 0) {
      throw new RangeError(
        "LineBuffer capacity must be a non-negative integer",
      );
    }
    this.#capacity = initialCapacity;
    this.screenX = new Int32Array(initialCapacity * 2);
    this.screenY = new Int32Array(initialCapacity * 2);
    this.ndcZ = new Float32Array(initialCapacity * 2);
    this.fogFactor = new Float32Array(initialCapacity * 2);
    this.vertexIndex = new Uint32Array(initialCapacity * 2);
    this.sourceT = new Float32Array(initialCapacity * 2);
    this.dashPhase = new Float32Array(initialCapacity);
    this.continuesPrevious = new Uint8Array(initialCapacity);
  }

  /** Number of allocated segment slots (not endpoint values). */
  get capacity(): number {
    return this.#capacity;
  }

  /** Clears logical contents while retaining typed-array storage. */
  reset(): void {
    this.length = 0;
  }

  /** Ensures room for at least `segmentCount` segments. */
  ensureCapacity(segmentCount: number): void {
    if (!Number.isInteger(segmentCount) || segmentCount < 0) {
      throw new RangeError(
        "LineBuffer capacity must be a non-negative integer",
      );
    }
    if (segmentCount <= this.#capacity) return;

    let next = Math.max(1, this.#capacity);
    while (next < segmentCount) next *= 2;
    const screenX = new Int32Array(next * 2);
    const screenY = new Int32Array(next * 2);
    const ndcZ = new Float32Array(next * 2);
    const fogFactor = new Float32Array(next * 2);
    const vertexIndex = new Uint32Array(next * 2);
    const sourceT = new Float32Array(next * 2);
    const dashPhase = new Float32Array(next);
    const continuesPrevious = new Uint8Array(next);
    screenX.set(this.screenX);
    screenY.set(this.screenY);
    ndcZ.set(this.ndcZ);
    fogFactor.set(this.fogFactor);
    vertexIndex.set(this.vertexIndex);
    sourceT.set(this.sourceT);
    dashPhase.set(this.dashPhase);
    continuesPrevious.set(this.continuesPrevious);
    this.screenX = screenX;
    this.screenY = screenY;
    this.ndcZ = ndcZ;
    this.fogFactor = fogFactor;
    this.vertexIndex = vertexIndex;
    this.sourceT = sourceT;
    this.dashPhase = dashPhase;
    this.continuesPrevious = continuesPrevious;
    this.#capacity = next;
  }

  /** Appends one clipped segment and returns its physical segment index. */
  append(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    z0: number,
    z1: number,
    fog0: number,
    fog1: number,
    vertex0: number,
    vertex1: number,
    sourceT0: number,
    sourceT1: number,
    dashPhase = 0,
    continuesPrevious = false,
  ): number {
    if (
      !(
        Number.isFinite(x0) &&
        Number.isFinite(y0) &&
        Number.isFinite(x1) &&
        Number.isFinite(y1) &&
        Number.isInteger(x0) &&
        Number.isInteger(y0) &&
        Number.isInteger(x1) &&
        Number.isInteger(y1) &&
        Number.isFinite(z0) &&
        Number.isFinite(z1) &&
        Number.isFinite(fog0) &&
        Number.isFinite(fog1) &&
        Number.isInteger(vertex0)
      ) ||
      vertex0 < 0 ||
      !Number.isInteger(vertex1) ||
      vertex1 < 0 ||
      !Number.isFinite(sourceT0) ||
      !Number.isFinite(sourceT1) ||
      !Number.isFinite(dashPhase) ||
      dashPhase < 0 ||
      typeof continuesPrevious !== "boolean"
    ) {
      throw new RangeError("LineBuffer segment values must be finite");
    }
    this.ensureCapacity(this.length + 1);
    const segment = this.length++;
    const offset = segment * 2;
    this.screenX[offset] = x0;
    this.screenX[offset + 1] = x1;
    this.screenY[offset] = y0;
    this.screenY[offset + 1] = y1;
    this.ndcZ[offset] = z0;
    this.ndcZ[offset + 1] = z1;
    this.fogFactor[offset] = fog0;
    this.fogFactor[offset + 1] = fog1;
    this.vertexIndex[offset] = vertex0;
    this.vertexIndex[offset + 1] = vertex1;
    this.sourceT[offset] = sourceT0;
    this.sourceT[offset + 1] = sourceT1;
    this.dashPhase[segment] = dashPhase;
    this.continuesPrevious[segment] = continuesPrevious ? 1 : 0;
    return segment;
  }
}

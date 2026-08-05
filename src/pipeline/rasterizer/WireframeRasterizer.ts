import { EdgeWalker } from "./EdgeWalker.ts";

/** Rasterizes triangle edges as wireframe lines. */
export class WireframeRasterizer {
  readonly #walker = new EdgeWalker();
  #clipLower = 0;
  #clipUpper = 1;

  /** Rasterizes the three edges of a triangle using Bresenham line walking. */
  rasterize(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    callback: (x: number, y: number) => void,
    width?: number,
    height?: number,
  ): void {
    this.#walkEdge(x1, y1, x2, y2, callback, width, height);
    this.#walkEdge(x2, y2, x3, y3, callback, width, height);
    this.#walkEdge(x3, y3, x1, y1, callback, width, height);
  }

  #walkEdge(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    callback: (x: number, y: number) => void,
    width?: number,
    height?: number,
  ): void {
    const qx1 = quantize(x1);
    const qy1 = quantize(y1);
    const qx2 = quantize(x2);
    const qy2 = quantize(y2);
    if (width === undefined || height === undefined) {
      this.#walker.walk(qx1, qy1, qx2, qy2, callback);
      return;
    }
    if (
      !(Number.isInteger(width) && Number.isInteger(height)) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new RangeError("Wireframe requires a positive integer viewport");
    }

    const dx = qx2 - qx1;
    const dy = qy2 - qy1;
    this.#clipLower = 0;
    this.#clipUpper = 1;
    if (!this.#clipPlane(-dx, qx1)) return;
    if (!this.#clipPlane(dx, width - 1 - qx1)) return;
    if (!this.#clipPlane(-dy, qy1)) return;
    if (!this.#clipPlane(dy, height - 1 - qy1)) return;

    const lower = this.#clipLower;
    const upper = this.#clipUpper;
    this.#walker.walk(
      clamp(Math.round(qx1 + dx * lower), 0, width - 1),
      clamp(Math.round(qy1 + dy * lower), 0, height - 1),
      clamp(Math.round(qx1 + dx * upper), 0, width - 1),
      clamp(Math.round(qy1 + dy * upper), 0, height - 1),
      callback,
      width,
      height,
    );
  }

  #clipPlane(p: number, q: number): boolean {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) this.#clipLower = Math.max(this.#clipLower, t);
    else this.#clipUpper = Math.min(this.#clipUpper, t);
    return this.#clipLower <= this.#clipUpper;
  }
}

function quantize(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError("Wireframe endpoints must be finite");
  }
  return Math.round(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return value < minimum ? minimum : value > maximum ? maximum : value;
}

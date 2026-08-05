import { clamp, fastTrunc } from "../../math/MathUtils.ts";

interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

interface Settable3 {
  set(x: number, y: number, z: number): Settable3;
}

/** Projects view-space coordinates to screen-space pixel positions. */
export class ViewToScreen {
  #width: number;
  #height: number;

  /** Constructs an NDC projector for the requested viewport dimensions. */
  constructor(width: number, height: number) {
    this.#width = width;
    this.#height = height;
  }

  /** Viewport width in pixels used for NDC projection. */
  get width(): number {
    return this.#width;
  }

  /** Viewport height in pixels used for NDC projection. */
  get height(): number {
    return this.#height;
  }

  /** Updates the viewport dimensions and retained projection state. */
  setSize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
  }

  /** Projects NDC coordinates to integer screen-space pixel coordinates. */
  project(
    ndcX: number,
    ndcY: number,
    ndcZ: number,
    target: Settable3,
  ): Settable3 {
    const screenX = fastTrunc(((ndcX + 1) * this.#width) >> 1);
    const screenY = fastTrunc(((1 - ndcY) * this.#height) >> 1);
    const clampedX = clamp(screenX, 0, this.#width - 1);
    const clampedY = clamp(screenY, 0, this.#height - 1);
    return target.set(clampedX, clampedY, ndcZ);
  }

  /** Convenience wrapper: projects a point's x/y/z via project(). */
  projectPoint(point: Vec3Like, target: Settable3): Settable3 {
    return this.project(point.x, point.y, point.z, target);
  }
}

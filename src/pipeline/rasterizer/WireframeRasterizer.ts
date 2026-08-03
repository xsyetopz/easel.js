import { EdgeWalker } from "./EdgeWalker.js";

/** Rasterizes triangle edges as wireframe lines. */
export class WireframeRasterizer {
  #walker = new EdgeWalker();

  /** Rasterizes the three edges of a triangle using Bresenham line walking. */
  rasterize(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    callback: (x: number, y: number) => void,
  ): void {
    this.#walker.walk(x1, y1, x2, y2, callback);
    this.#walker.walk(x2, y2, x3, y3, callback);
    this.#walker.walk(x3, y3, x1, y1, callback);
  }
}

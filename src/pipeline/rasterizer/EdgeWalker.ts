/** Scanline edge walker for triangle rasterization. */
export class EdgeWalker {
  /**
   * Walks integer pixels along a line from (x1,y1) to (x2,y2) using
   * Bresenham's line algorithm.
   */
  walk(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    callback: (x: number, y: number) => void,
    width?: number,
    height?: number,
  ): void {
    if (
      !(
        Number.isFinite(x1) &&
        Number.isFinite(y1) &&
        Number.isFinite(x2) &&
        Number.isFinite(y2) &&
        Number.isInteger(x1) &&
        Number.isInteger(y1) &&
        Number.isInteger(x2) &&
        Number.isInteger(y2)
      )
    ) {
      throw new RangeError("EdgeWalker requires finite integer endpoints");
    }
    if (
      width !== undefined &&
      height !== undefined &&
      (x1 < 0 ||
        x1 >= width ||
        x2 < 0 ||
        x2 >= width ||
        y1 < 0 ||
        y1 >= height ||
        y2 < 0 ||
        y2 >= height)
    ) {
      throw new RangeError(
        "EdgeWalker endpoints must be inside the framebuffer",
      );
    }
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    let cx = x1;
    let cy = y1;

    const maxSteps = Math.max(dx, dy) + 1;
    let steps = 0;
    while (true) {
      if (++steps > maxSteps) {
        throw new Error("EdgeWalker exceeded its bounded iteration count");
      }
      callback(cx, cy);
      if (cx === x2 && cy === y2) break;
      const e2 = err << 1;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }
}

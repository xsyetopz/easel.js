/** Rasterizes point primitives as fixed-size squares. */
export class PointRasterizer {
  /** Fills a circle at (cx, cy) with integer pixel radius, clamped to screen. */
  rasterize(
    cx: number,
    cy: number,
    radius: number,
    width: number,
    height: number,
    callback: (x: number, y: number) => void,
  ): void {
    const r2 = radius * radius;
    const yMin = Math.max(0, Math.ceil(cy - radius));
    const yMax = Math.min(height - 1, Math.floor(cy + radius));

    for (let y = yMin; y <= yMax; y++) {
      const dy = y - cy;
      const halfW = Math.sqrt(r2 - dy * dy);
      const xMin = Math.max(0, Math.ceil(cx - halfW));
      const xMax = Math.min(width - 1, Math.floor(cx + halfW));
      for (let x = xMin; x <= xMax; x++) {
        callback(x, y);
      }
    }
  }
}

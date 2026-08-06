type ScanlineCallback = (
  y: number,
  xStart: number,
  xEnd: number,
  uStart: number,
  vStart: number,
  duDx: number,
  dvDx: number,
) => void;

/** Fills a horizontal scanline span with shaded pixels. */
export class ScanlineFill {
  /**
   * Rasterizes a triangle defined by three screen-space points.
   * Calls callback once per scanline with barycentric start values and
   * per-pixel deltas, relative to the original vertex order (u->v1, v->v2).
   */
  fill(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    width: number,
    height: number,
    callback: ScanlineCallback,
  ): void {
    // Barycentric partial derivatives computed from the original (pre-sort) vertices.
    const denom = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);

    // Degenerate triangle - no area to fill.
    if (denom === 0) return;

    const invDenom = 1 / denom;

    // Per-triangle barycentric X-deltas (constant across all scanlines).
    const duDx = (y2 - y3) * invDenom;
    const dvDx = (y3 - y1) * invDenom;

    // Sort three vertices by ascending Y using a sorting network.
    let ax = x1;
    let ay = y1;
    let bx = x2;
    let by = y2;
    let cx = x3;
    let cy = y3;
    if (ay > by) {
      let t: number;
      t = ax;
      ax = bx;
      bx = t;
      t = ay;
      ay = by;
      by = t;
    }
    if (ay > cy) {
      let t: number;
      t = ax;
      ax = cx;
      cx = t;
      t = ay;
      ay = cy;
      cy = t;
    }
    if (by > cy) {
      let t: number;
      t = bx;
      bx = cx;
      cx = t;
      t = by;
      by = cy;
      cy = t;
    }

    if (by === cy) {
      this.#fillFlatBottom(
        ax,
        ay,
        bx,
        by,
        cx,
        cy,
        width,
        height,
        x1,
        y1,
        x2,
        y2,
        x3,
        y3,
        invDenom,
        duDx,
        dvDx,
        callback,
      );
    } else if (ay === by) {
      this.#fillFlatTop(
        ax,
        ay,
        bx,
        by,
        cx,
        cy,
        width,
        height,
        x1,
        y1,
        x2,
        y2,
        x3,
        y3,
        invDenom,
        duDx,
        dvDx,
        callback,
      );
    } else {
      // Split at middle-vertex Y into flat-bottom + flat-top.
      const t = (by - ay) / (cy - ay);
      const mx = ax + t * (cx - ax);
      const my = by;
      this.#fillFlatBottom(
        ax,
        ay,
        bx,
        by,
        mx,
        my,
        width,
        height,
        x1,
        y1,
        x2,
        y2,
        x3,
        y3,
        invDenom,
        duDx,
        dvDx,
        callback,
      );
      this.#fillFlatTop(
        bx,
        by,
        mx,
        my,
        cx,
        cy,
        width,
        height,
        x1,
        y1,
        x2,
        y2,
        x3,
        y3,
        invDenom,
        duDx,
        dvDx,
        callback,
      );
    }
  }

  #fillFlatBottom(
    topX: number,
    topY: number,
    botLeftX: number,
    botLeftY: number,
    botRightX: number,
    _botRightY: number,
    width: number,
    height: number,
    ox1: number,
    oy1: number,
    ox2: number,
    oy2: number,
    ox3: number,
    oy3: number,
    invDenom: number,
    duDx: number,
    dvDx: number,
    callback: ScanlineCallback,
  ): void {
    const dy = botLeftY - topY;
    if (dy === 0) return;
    const slopeL = (botLeftX - topX) / dy;
    const slopeR = (botRightX - topX) / dy;
    const clampedStart = Math.ceil(topY) < 0 ? 0 : Math.ceil(topY);
    const clampedEnd =
      Math.floor(botLeftY) >= height ? height - 1 : Math.floor(botLeftY);
    if (clampedStart > clampedEnd) return;

    // Hoisted barycentric coefficients (constant per triangle).
    const uDy = (ox3 - ox2) * invDenom;
    const uDx = (oy2 - oy3) * invDenom;
    const vDy = (ox1 - ox3) * invDenom;
    const vDx = (oy3 - oy1) * invDenom;

    let xL = topX + (clampedStart - topY) * slopeL;
    let xR = topX + (clampedStart - topY) * slopeR;

    for (
      let y = clampedStart;
      y <= clampedEnd;
      y++, xL += slopeL, xR += slopeR
    ) {
      this.#fillScanline(
        y,
        xL,
        xR,
        width,
        ox3,
        oy3,
        uDy,
        uDx,
        vDy,
        vDx,
        duDx,
        dvDx,
        callback,
      );
    }
  }

  #fillFlatTop(
    topLeftX: number,
    topLeftY: number,
    topRightX: number,
    _topRightY: number,
    botX: number,
    botY: number,
    width: number,
    height: number,
    ox1: number,
    oy1: number,
    ox2: number,
    oy2: number,
    ox3: number,
    oy3: number,
    invDenom: number,
    duDx: number,
    dvDx: number,
    callback: ScanlineCallback,
  ): void {
    const dy = botY - topLeftY;
    if (dy === 0) return;
    const slopeL = (botX - topLeftX) / dy;
    const slopeR = (botX - topRightX) / dy;
    const clampedStart = Math.ceil(topLeftY) < 0 ? 0 : Math.ceil(topLeftY);
    const clampedEnd =
      Math.floor(botY) >= height ? height - 1 : Math.floor(botY);
    if (clampedStart > clampedEnd) return;

    // Hoisted barycentric coefficients (constant per triangle).
    const uDy = (ox3 - ox2) * invDenom;
    const uDx = (oy2 - oy3) * invDenom;
    const vDy = (ox1 - ox3) * invDenom;
    const vDx = (oy3 - oy1) * invDenom;

    let xL = topLeftX + (clampedStart - topLeftY) * slopeL;
    let xR = topRightX + (clampedStart - topLeftY) * slopeR;

    for (
      let y = clampedStart;
      y <= clampedEnd;
      y++, xL += slopeL, xR += slopeR
    ) {
      this.#fillScanline(
        y,
        xL,
        xR,
        width,
        ox3,
        oy3,
        uDy,
        uDx,
        vDy,
        vDx,
        duDx,
        dvDx,
        callback,
      );
    }
  }

  /** Computes barycentric start values for the scanline and calls callback once. */
  #fillScanline(
    y: number,
    xLeft: number,
    xRight: number,
    width: number,
    ox3: number,
    oy3: number,
    uDy: number,
    uDx: number,
    vDy: number,
    vDx: number,
    duDx: number,
    dvDx: number,
    callback: ScanlineCallback,
  ): void {
    const xLeftMinRight = xLeft < xRight ? xLeft : xRight;
    const rawStart = Math.ceil(xLeftMinRight);
    const xLeftMaxRight = xLeft > xRight ? xLeft : xRight;
    const rawEnd = xLeftMaxRight | 0;

    if (rawEnd < 0 || rawStart >= width) return;

    const startX = rawStart > 0 ? rawStart : 0;
    const endX = rawEnd < width - 1 ? rawEnd : width - 1;
    if (startX > endX) return;

    // Barycentric start values at (startX, y) using pre-hoisted coefficients.
    const dy3 = y - oy3;
    const dx3Start = startX - ox3;
    const uStart = uDx * dx3Start + uDy * dy3;
    const vStart = vDx * dx3Start + vDy * dy3;

    callback(y, startX, endX, uStart, vStart, duDx, dvDx);
  }
}

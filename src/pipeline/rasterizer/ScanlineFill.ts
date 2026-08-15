type ScanlineCallback = (
  ...args: [
    y: number,
    xStart: number,
    xEnd: number,
    uStart: number,
    vStart: number,
    duDx: number,
    dvDx: number,
  ]
) => void;

type FillArgs = [
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  width: number,
  height: number,
  callback: ScanlineCallback,
];

type Point = readonly [x: number, y: number];
type Triangle = readonly [Point, Point, Point];

interface FlatSpan {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

interface FillContext {
  width: number;
  height: number;
  vertices: Triangle;
  originalThird: Point;
  uDy: number;
  uDx: number;
  vDy: number;
  vDx: number;
  duDx: number;
  dvDx: number;
  callback: ScanlineCallback;
}

function createFillContext(args: FillArgs): FillContext | undefined {
  const [x1, y1, x2, y2, x3, y3, width, height, callback] = args;
  // Barycentric partial derivatives computed from the original (pre-sort) vertices.
  const denom = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);

  // Degenerate triangle - no area to fill.
  if (denom === 0) return;

  const invDenom = 1 / denom;
  return {
    width,
    height,
    vertices: [
      [x1, y1],
      [x2, y2],
      [x3, y3],
    ],
    originalThird: [x3, y3],
    uDy: (x3 - x2) * invDenom,
    uDx: (y2 - y3) * invDenom,
    vDy: (x1 - x3) * invDenom,
    vDx: (y3 - y1) * invDenom,
    // Per-triangle barycentric X-deltas (constant across all scanlines).
    duDx: (y2 - y3) * invDenom,
    dvDx: (y3 - y1) * invDenom,
    callback,
  };
}

function sortVertices(vertices: Triangle): Triangle {
  let [a, b, c] = vertices;
  if (a[1] > b[1]) [a, b] = [b, a];
  if (a[1] > c[1]) [a, c] = [c, a];
  if (b[1] > c[1]) [b, c] = [c, b];
  return [a, b, c];
}

function fillTriangle(args: FillArgs): void {
  const context = createFillContext(args);
  if (context === undefined) return;

  const [a, b, c] = sortVertices(context.vertices);
  if (b[1] === c[1]) {
    fillFlat(
      { topLeft: a, topRight: a, bottomLeft: b, bottomRight: c },
      context,
    );
  } else if (a[1] === b[1]) {
    fillFlat(
      { topLeft: a, topRight: b, bottomLeft: c, bottomRight: c },
      context,
    );
  } else {
    // Split at middle-vertex Y into flat-bottom + flat-top.
    const t = (b[1] - a[1]) / (c[1] - a[1]);
    const middle: Point = [a[0] + t * (c[0] - a[0]), b[1]];
    fillFlat(
      { topLeft: a, topRight: a, bottomLeft: b, bottomRight: middle },
      context,
    );
    fillFlat(
      { topLeft: b, topRight: middle, bottomLeft: c, bottomRight: c },
      context,
    );
  }
}

function fillFlat(span: FlatSpan, context: FillContext): void {
  const { topLeft, topRight, bottomLeft, bottomRight } = span;
  const topY = topLeft[1];
  const bottomY = bottomLeft[1];
  const dy = bottomY - topY;
  if (dy === 0) return;

  const slopeL = (bottomLeft[0] - topLeft[0]) / dy;
  const slopeR = (bottomRight[0] - topRight[0]) / dy;
  const clampedStart = Math.max(0, Math.ceil(topY));
  const clampedEnd =
    Math.floor(bottomY) >= context.height
      ? context.height - 1
      : Math.floor(bottomY);
  if (clampedStart > clampedEnd) return;

  let xL = topLeft[0] + (clampedStart - topY) * slopeL;
  let xR = topRight[0] + (clampedStart - topY) * slopeR;
  for (let y = clampedStart; y <= clampedEnd; y++, xL += slopeL, xR += slopeR) {
    fillScanline(context, y, xL, xR);
  }
}

/** Computes barycentric start values for the scanline and calls callback once. */
function fillScanline(
  context: FillContext,
  y: number,
  xLeft: number,
  xRight: number,
): void {
  const xLeftMinRight = Math.min(xLeft, xRight);
  const rawStart = Math.ceil(xLeftMinRight);
  const xLeftMaxRight = Math.max(xLeft, xRight);
  const rawEnd = xLeftMaxRight | 0;

  if (rawEnd < 0 || rawStart >= context.width) return;

  const startX = Math.max(rawStart, 0);
  const endX = Math.min(rawEnd, context.width - 1);
  if (startX > endX) return;

  // Barycentric start values at (startX, y) using pre-hoisted coefficients.
  const dy3 = y - context.originalThird[1];
  const dx3Start = startX - context.originalThird[0];
  const uStart = context.uDx * dx3Start + context.uDy * dy3;
  const vStart = context.vDx * dx3Start + context.vDy * dy3;

  context.callback(y, startX, endX, uStart, vStart, context.duDx, context.dvDx);
}

/** Fills a horizontal scanline span with shaded pixels. */
export class ScanlineFill {
  /**
   * Rasterizes a triangle defined by three screen-space points.
   * Calls callback once per scanline with barycentric start values and
   * per-pixel deltas, relative to the original vertex order (u->v1, v->v2).
   */
  fill(...args: FillArgs): void {
    fillTriangle(args);
  }
}

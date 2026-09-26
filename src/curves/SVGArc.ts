import type { ShapePath } from "./ShapePath.ts";

interface Point {
  x: number;
  y: number;
}

/**
 * Appends an SVG endpoint-parameterized elliptical arc to an EASEL path,
 * following three.js r186 `SVGLoader`'s `parseArcCommand`: the signed sweep
 * goes into the end angle and `clockwise` is `sweep === false`.
 */
export function appendSVGArc(
  path: NonNullable<ShapePath["currentPath"]>,
  start: Point,
  end: Point,
  options: {
    rx: number;
    ry: number;
    rotation: number;
    largeArc: boolean;
    sweep: boolean;
  },
): void {
  let { rx, ry } = options;
  if (rx === 0 || ry === 0 || (start.x === end.x && start.y === end.y)) {
    path.lineTo(end.x, end.y);
    return;
  }
  const phi = (options.rotation * Math.PI) / 180;
  rx = Math.abs(rx);
  ry = Math.abs(ry);

  // Compute (x1', y1').
  const dx2 = (start.x - end.x) / 2.0;
  const dy2 = (start.y - end.y) / 2.0;
  const x1p = Math.cos(phi) * dx2 + Math.sin(phi) * dy2;
  const y1p = -Math.sin(phi) * dx2 + Math.cos(phi) * dy2;

  // Compute (cx', cy'), scaling the radii up when they are too small.
  let rxs = rx * rx;
  let rys = ry * ry;
  const x1ps = x1p * x1p;
  const y1ps = y1p * y1p;
  const cr = x1ps / rxs + y1ps / rys;
  if (cr > 1) {
    const s = Math.sqrt(cr);
    rx = s * rx;
    ry = s * ry;
    rxs = rx * rx;
    rys = ry * ry;
  }
  const dq = rxs * y1ps + rys * x1ps;
  const pq = (rxs * rys - dq) / dq;
  let q = Math.sqrt(Math.max(0, pq));
  if (options.largeArc === options.sweep) q = -q;
  const cxp = (q * rx * y1p) / ry;
  const cyp = (-q * ry * x1p) / rx;

  // Compute (cx, cy) from (cx', cy').
  const cx = Math.cos(phi) * cxp - Math.sin(phi) * cyp + (start.x + end.x) / 2;
  const cy = Math.sin(phi) * cxp + Math.cos(phi) * cyp + (start.y + end.y) / 2;

  // Compute the start angle and the signed sweep.
  const theta = svgAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  const delta =
    svgAngle(
      (x1p - cxp) / rx,
      (y1p - cyp) / ry,
      (-x1p - cxp) / rx,
      (-y1p - cyp) / ry,
    ) %
    (Math.PI * 2);

  path.absellipse(cx, cy, rx, ry, theta, theta + delta, !options.sweep, phi);
}

/** Signed angle from vector `u` to vector `v`, as three.js's `svgAngle`. */
function svgAngle(ux: number, uy: number, vx: number, vy: number): number {
  const dot = ux * vx + uy * vy;
  const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
  // Clamp: rounding can push the cosine slightly past [-1, 1].
  const angle = Math.acos(Math.max(-1, Math.min(1, dot / len)));
  return ux * vy - uy * vx < 0 ? -angle : angle;
}

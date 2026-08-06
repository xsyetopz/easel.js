import type { ShapePath } from "./ShapePath.ts";

interface Point {
  x: number;
  y: number;
}

/** Appends an SVG endpoint-parameterized elliptical arc to an EASEL path. */
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
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = (start.x - end.x) / 2;
  const dy = (start.y - end.y) / 2;
  const x1 = cosPhi * dx + sinPhi * dy;
  const y1 = -sinPhi * dx + cosPhi * dy;
  let rx2 = rx * rx;
  let ry2 = ry * ry;
  const lambda = (x1 * x1) / rx2 + (y1 * y1) / ry2;
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
    rx2 = rx * rx;
    ry2 = ry * ry;
  }
  const sign = options.largeArc === options.sweep ? -1 : 1;
  const denominator = rx2 * y1 * y1 + ry2 * x1 * x1;
  const numerator = Math.max(
    0,
    (rx2 * ry2 - rx2 * y1 * y1 - ry2 * x1 * x1) / denominator,
  );
  const coefficient = sign * Math.sqrt(numerator);
  const cxPrime = coefficient * ((rx * y1) / ry);
  const cyPrime = coefficient * (-(ry * x1) / rx);
  const cx = cosPhi * cxPrime - sinPhi * cyPrime + (start.x + end.x) / 2;
  const cy = sinPhi * cxPrime + cosPhi * cyPrime + (start.y + end.y) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy;
    const length = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const result = Math.acos(Math.max(-1, Math.min(1, dot / length)));
    return ux * vy - uy * vx < 0 ? -result : result;
  };
  const startAngle = angle(1, 0, (x1 - cxPrime) / rx, (y1 - cyPrime) / ry);
  let delta = angle(
    (x1 - cxPrime) / rx,
    (y1 - cyPrime) / ry,
    (-x1 - cxPrime) / rx,
    (-y1 - cyPrime) / ry,
  );
  if (!options.sweep && delta > 0) delta -= Math.PI * 2;
  if (options.sweep && delta < 0) delta += Math.PI * 2;
  path.absellipse(
    cx,
    cy,
    rx,
    ry,
    startAngle,
    startAngle + delta,
    !options.sweep,
    phi,
  );
}

import type { Curve } from "./Curve.ts";
import type { CurvePath } from "./CurvePath.ts";
import { CubicBezierCurve } from "./curves/CubicBezierCurve.ts";
import { EllipseCurve } from "./curves/EllipseCurve.ts";
import { LineCurve } from "./curves/LineCurve.ts";
import { QuadraticBezierCurve } from "./curves/QuadraticBezierCurve.ts";
import type { ShapePath } from "./ShapePath.ts";

/** Options controlling SVG path serialization. */
export interface SVGPathSerializerOptions {
  /** Sampling subdivisions for curves without a native SVG command. */
  divisions?: number;
  /** Whether paths are closed with a final `Z` command when possible. */
  close?: boolean;
}

/** Serializes an EASEL CurvePath into SVG path data. */
export function serializeSVGPath(
  path: CurvePath,
  options: SVGPathSerializerOptions = {},
): string {
  const divisions = Math.max(1, Math.floor(options.divisions ?? 12));
  const output: string[] = [];
  for (const curve of path.curves) appendCurve(output, curve, divisions);
  if (options.close || path.autoClose) output.push("Z");
  return output.join(" ");
}

/** Serializes all SVG ShapePath subpaths into one SVG path-data string. */
export function serializeSVGShapePath(
  shapePath: ShapePath,
  options: SVGPathSerializerOptions = {},
): string {
  return shapePath.subPaths
    .map((path) => serializeSVGPath(path, options))
    .filter(Boolean)
    .join(" ");
}

/** Alias for callers that prefer a shorter path-to-data name. */
export const pathToSVG: typeof serializeSVGPath = serializeSVGPath;

/** Creates an SVG `<path>` element for an EASEL path in a browser document. */
export function createSVGPathElement(
  path: CurvePath,
  documentRef: Document = globalThis.document,
  options: SVGPathSerializerOptions = {},
): SVGPathElement {
  const element = documentRef.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  element.setAttribute("d", serializeSVGPath(path, options));
  return element;
}

function appendCurve(output: string[], curve: Curve, divisions: number): void {
  const start = curve.getPoint(0);
  if (!start) return;
  if (output.length === 0)
    output.push(`M ${format(start.x)} ${format(start.y)}`);
  if (curve instanceof LineCurve) {
    const end = curve.getPoint(1);
    output.push(`L ${format(end.x)} ${format(end.y)}`);
    return;
  }
  if (curve instanceof QuadraticBezierCurve) {
    const end = curve.getPoint(1);
    output.push(
      `Q ${format(curve.v1.x)} ${format(curve.v1.y)} ${format(end.x)} ${format(end.y)}`,
    );
    return;
  }
  if (curve instanceof CubicBezierCurve) {
    const end = curve.getPoint(1);
    output.push(
      `C ${format(curve.v1.x)} ${format(curve.v1.y)} ${format(curve.v2.x)} ${format(curve.v2.y)} ${format(end.x)} ${format(end.y)}`,
    );
    return;
  }
  if (curve instanceof EllipseCurve) {
    const end = curve.getPoint(1);
    const largeArc =
      Math.abs(curve.endAngle - curve.startAngle) > Math.PI ? 1 : 0;
    const sweep = curve.clockwise ? 0 : 1;
    output.push(
      `A ${format(curve.xRadius)} ${format(curve.yRadius)} ${format((curve.rotation * 180) / Math.PI)} ${largeArc} ${sweep} ${format(end.x)} ${format(end.y)}`,
    );
    return;
  }
  const samples = Math.max(2, divisions);
  for (let index = 1; index <= samples; index++) {
    const point = curve.getPoint(index / samples);
    if (point) output.push(`L ${format(point.x)} ${format(point.y)}`);
  }
}

function format(value: number): string {
  if (!Number.isFinite(value))
    throw new RangeError("SVG path serialization requires finite coordinates");
  return Number(value.toFixed(6)).toString();
}

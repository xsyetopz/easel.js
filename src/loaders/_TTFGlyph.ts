import { ShapePath } from "../curves/ShapePath.ts";
import type { OutlinePoint } from "./_TTFParser.ts";

export function outlineToString(
  contours: readonly (readonly OutlinePoint[])[],
  scale: number,
  reversed: boolean,
): string {
  const parts: string[] = [];
  for (const sourceContour of contours) {
    const contour = reversed
      ? [...sourceContour].reverse()
      : [...sourceContour];
    if (contour.length === 0) continue;
    const first = contour[0];
    if (!first) continue;
    let startIndex: number;
    let start: OutlinePoint;
    if (first.onCurve) {
      startIndex = 0;
      start = first;
    } else {
      const last = contour.at(-1);
      if (last?.onCurve) {
        startIndex = contour.length - 1;
        start = last;
      } else {
        startIndex = -1;
        start = midpoint(last ?? first, first);
      }
    }
    parts.push(`m ${round(start.x * scale)} ${round(start.y * scale)}`);
    let pending: OutlinePoint | undefined;
    let current = start;
    for (let i = 0; i < contour.length; i++) {
      const point =
        contour[(startIndex + 1 + i + contour.length) % contour.length];
      if (!point) continue;
      if (point.onCurve) {
        if (pending) {
          parts.push(
            `q ${round(point.x * scale)} ${round(point.y * scale)} ${round(pending.x * scale)} ${round(pending.y * scale)}`,
          );
          pending = undefined;
        } else if (!samePoint(current, point)) {
          parts.push(`l ${round(point.x * scale)} ${round(point.y * scale)}`);
        }
        current = point;
        continue;
      }
      if (pending) {
        const implied = midpoint(pending, point);
        parts.push(
          `q ${round(implied.x * scale)} ${round(implied.y * scale)} ${round(pending.x * scale)} ${round(pending.y * scale)}`,
        );
        current = implied;
      }
      pending = point;
    }
    if (pending) {
      parts.push(
        `q ${round(start.x * scale)} ${round(start.y * scale)} ${round(pending.x * scale)} ${round(pending.y * scale)}`,
      );
    } else if (!samePoint(current, start)) {
      parts.push(`l ${round(start.x * scale)} ${round(start.y * scale)}`);
    }
    parts.push("z");
  }
  return parts.join(" ");
}

export function parseGlyphPath(
  outline: string,
  scale: number,
  offsetX: number,
  offsetY: number,
): ShapePath {
  const path = new ShapePath();
  const tokens = outline.trim().length > 0 ? outline.trim().split(/\s+/u) : [];
  let index = 0;
  const read = (): number => {
    const value = Number.parseFloat(tokens[index++] ?? "NaN");
    if (!Number.isFinite(value))
      throw new Error("TTFFont: malformed glyph outline.");
    return value;
  };
  while (index < tokens.length) {
    const command = tokens[index++];
    switch (command) {
      case "m":
        path.moveTo(read() * scale + offsetX, read() * scale + offsetY);
        break;
      case "l":
        path.lineTo(read() * scale + offsetX, read() * scale + offsetY);
        break;
      case "q": {
        const x = read() * scale + offsetX;
        const y = read() * scale + offsetY;
        const controlX = read() * scale + offsetX;
        const controlY = read() * scale + offsetY;
        path.quadraticCurveTo(controlX, controlY, x, y);
        break;
      }
      case "b": {
        const x = read() * scale + offsetX;
        const y = read() * scale + offsetY;
        const control1X = read() * scale + offsetX;
        const control1Y = read() * scale + offsetY;
        const control2X = read() * scale + offsetX;
        const control2Y = read() * scale + offsetY;
        path.bezierCurveTo(control1X, control1Y, control2X, control2Y, x, y);
        break;
      }
      case "z":
        path.currentPath?.closePath();
        break;
      default:
        throw new Error(
          `TTFFont: unsupported glyph command ${String(command)}.`,
        );
    }
  }
  return path;
}

export function midpoint(
  left: OutlinePoint,
  right: OutlinePoint,
): OutlinePoint {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    onCurve: true,
  };
}

export function samePoint(left: OutlinePoint, right: OutlinePoint): boolean {
  return left.x === right.x && left.y === right.y;
}

export function round(value: number): number {
  return Math.round(value);
}

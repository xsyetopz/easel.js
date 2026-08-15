import { Color } from "../math/Color.ts";
import type { Vector2 } from "../math/Vector2.ts";
import { Path } from "./Path.ts";
import { Shape } from "./Shape.ts";

/** Builder that converts SVG-style subpaths into `Shape` contours. */
export class ShapePath {
  /** Serialization discriminator for this runtime type. */
  type: string = "ShapePath";
  #subPaths: Path[] = [];
  #currentPath: Path | undefined;

  /** Optional fill color metadata associated with the source subpaths. */
  color = new Color();
  /** Loader and style metadata used when resolving fill rules. */
  userData: Record<string, unknown> = {};

  /** Mutable subpaths accumulated by this builder. */
  get subPaths(): Path[] {
    return this.#subPaths;
  }

  /** Replaces accumulated subpaths. */
  set subPaths(value: Path[]) {
    this.#subPaths = value.slice();
    this.#currentPath = this.#subPaths.at(-1);
  }

  /** Current subpath receiving drawing commands, if one exists. */
  get currentPath(): Path | undefined {
    return this.#currentPath;
  }

  /** Replaces the current drawing path. */
  set currentPath(value: Path | undefined) {
    this.#currentPath = value;
  }

  /** Starts a subpath at `(x, y)` and makes it the current drawing path. */
  moveTo(x: number, y: number): this {
    this.#currentPath = new Path();
    this.#subPaths.push(this.#currentPath);
    this.#currentPath.moveTo(x, y);
    return this;
  }

  /** Appends a line to the current subpath when one is active. */
  lineTo(x: number, y: number): this {
    this.#currentPath?.lineTo(x, y);
    return this;
  }

  /** Appends a quadratic Bezier to the current subpath when active. */
  quadraticCurveTo(cpX: number, cpY: number, x: number, y: number): this {
    this.#currentPath?.quadraticCurveTo(cpX, cpY, x, y);
    return this;
  }

  /** Appends a cubic Bezier to the current subpath when active. */
  bezierCurveTo(
    cp1X: number,
    cp1Y: number,
    cp2X: number,
    cp2Y: number,
    x: number,
    y: number,
  ): this {
    this.#currentPath?.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, x, y);
    return this;
  }

  /** Appends a spline to the current subpath when one is active. */
  splineThru(points: Vector2[]): this {
    this.#currentPath?.splineThru(points);
    return this;
  }

  /**
   * Converts subpaths into outer `Shape` contours and nested hole paths.
   *
   * Containment and winding are evaluated only when called; the builder keeps
   * no render-loop work or adaptive subdivision state.
   */
  toShapes(isCCW: boolean = false): Shape[] {
    const fillRule = getFillRule(this.userData);
    const entries: ShapeEntry[] = [];
    for (const path of this.#subPaths) {
      const points = path
        .getPoints()
        .filter((point): point is { x: number; y: number } => Boolean(point));
      if (points.length < 3) continue;
      const area = polygonArea(points);
      if (area === 0) continue;
      const bounds = polygonBounds(points);
      entries.push({
        path,
        points,
        bounds,
        interior: interiorPoint(points, bounds),
        area: isCCW ? -area : area,
        absArea: Math.abs(area),
        parent: undefined,
        winding: 0,
        boundary: false,
        role: "excluded",
      });
    }

    entries.sort((a, b) => b.absArea - a.absArea);
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      for (let j = i - 1; j >= 0; j--) {
        const candidate = entries[j];
        if (
          containsBounds(candidate.bounds, entry.bounds) &&
          pointInPolygon(entry.interior, candidate.points)
        ) {
          entry.parent = candidate;
          break;
        }
      }
      const containerWinding = entry.parent?.winding ?? 0;
      entry.winding = containerWinding + (entry.area < 0 ? -1 : 1);
      const wasInside = isInside(containerWinding, fillRule);
      const isInsideNow = isInside(entry.winding, fillRule);
      entry.boundary = wasInside !== isInsideNow;
      if (entry.boundary) {
        if (entry.parent?.role === "hole") {
          entry.role = "outer";
        } else if (entry.parent) {
          entry.role = "hole";
        } else {
          entry.role = "outer";
        }
      }
    }

    const shapes: Shape[] = [];
    const shapeByEntry = new Map<ShapeEntry, Shape>();
    for (const entry of entries) {
      if (!entry.boundary || entry.role !== "outer") continue;
      const shape = new Shape();
      shape.curves = entry.path.curves;
      shape.currentPoint.copy(entry.path.currentPoint);
      shapes.push(shape);
      shapeByEntry.set(entry, shape);
    }
    for (const entry of entries) {
      if (!entry.boundary || entry.role !== "hole" || !entry.parent) continue;
      const shape = shapeByEntry.get(entry.parent);
      if (!shape) continue;
      const hole = new Path();
      hole.curves = entry.path.curves;
      hole.currentPoint.copy(entry.path.currentPoint);
      shape.holes.push(hole);
    }
    return shapes;
  }
}

interface Point {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface ShapeEntry {
  path: Path;
  points: Point[];
  bounds: Bounds;
  interior: Point;
  area: number;
  absArea: number;
  parent: ShapeEntry | undefined;
  winding: number;
  boundary: boolean;
  role: "outer" | "hole" | "excluded";
}

/** Computes the signed area of a polygon in local units squared. */
function polygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

/** Computes axis-aligned bounds for a polygon. */
function polygonBounds(points: Point[]): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, minY, maxX, maxY };
}

/** Tests whether one axis-aligned bounds contains another. */
function containsBounds(outer: Bounds, inner: Bounds): boolean {
  return (
    outer.minX <= inner.minX &&
    outer.minY <= inner.minY &&
    outer.maxX >= inner.maxX &&
    outer.maxY >= inner.maxY
  );
}

/** Finds a point likely to lie strictly inside a polygon. */
function interiorPoint(points: Point[], bounds: Bounds): Point {
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  if (pointInPolygon(center, points)) return center;
  const y = center.y;
  const intercepts: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (a.y > y !== b.y > y)
      intercepts.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
  }
  intercepts.sort((a, b) => a - b);
  if (intercepts.length >= 2)
    return { x: (intercepts[0] + intercepts[1]) / 2, y };
  return points[0];
}

/** Tests polygon containment with the even-odd rule. */
function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Resolves the supported SVG fill rule metadata. */
function getFillRule(userData: Record<string, unknown>): "nonzero" | "evenodd" {
  const data = userData as Record<string, unknown> & {
    style?: unknown;
  };
  const style = data.style;
  const fillRule = isRecord(style)
    ? (style as Record<string, unknown> & { fillRule?: unknown }).fillRule
    : undefined;
  return fillRule === "evenodd" ? "evenodd" : "nonzero";
}

/** Tests winding membership under the selected fill rule. */
function isInside(winding: number, fillRule: "nonzero" | "evenodd"): boolean {
  return fillRule === "evenodd" ? Math.abs(winding) % 2 === 1 : winding !== 0;
}

/** Type guard for metadata records. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import type { Node } from "../core/Node.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Mesh } from "../objects/Mesh.ts";

/** A point in a CPU tool path. Coordinates use the exporter unit. */
export interface GCodePoint {
  /** Horizontal coordinate in the exporter unit. */
  x: number;
  /** Horizontal coordinate in the exporter unit. */
  y: number;
  /** Layer height in the exporter unit. */
  z: number;
}

/** A connected tool path. The first point is reached without extrusion. */
export interface GCodePath {
  /** Ordered points; a repeated first point closes a perimeter. */
  points: readonly GCodePoint[];
}

/** One horizontal mesh slice and its connected perimeter paths. */
export interface GCodeSlice {
  /** Height of this slice in the exporter unit. */
  z: number;
  /** Connected tool paths intersecting this slice. */
  paths: readonly GCodePath[];
}

/** Options for deterministic CPU mesh slicing and G-code serialization. */
export interface GCodeExporterOptions {
  /** Distance between generated horizontal slices. Defaults to `0.2`. */
  layerHeight?: number;
  /** Explicit slice heights. When present, this takes precedence over `layerHeight`. */
  layers?: readonly number[];
  /** Multiplier applied to mesh coordinates before writing G-code. Defaults to `1`. */
  scale?: number;
  /** Output coordinate unit. Defaults to millimeters. */
  units?: "mm" | "inch";
  /** Feed rate for non-cutting moves. Defaults to `3000`. */
  travelFeedRate?: number;
  /** Feed rate for cutting moves. Defaults to `1200`. */
  printFeedRate?: number;
  /** Absolute extrusion per coordinate unit. Omit to emit paths without an E axis. */
  extrusionPerUnit?: number;
  /** Decimal places used for coordinates and feed rates. Defaults to `3`. */
  precision?: number;
  /** Includes the deterministic setup comments and mode commands. Defaults to `true`. */
  includeHeader?: boolean;
  /** Includes `M2` at the end of the program. Defaults to `true`. */
  includeFooter?: boolean;
}

interface Triangle {
  first: GCodePoint;
  second: GCodePoint;
  third: GCodePoint;
}

interface Segment {
  first: GCodePoint;
  second: GCodePoint;
}

const matrix = new Matrix4();
const point = new Vector3();
const epsilon = 1e-7;

/** Slices EASEL meshes on the CPU and serializes their paths to deterministic G-code. */
export class GCodeExporter {
  /** Returns deterministic horizontal slices for every mesh beneath `root`. */
  slice(root: Node, options: GCodeExporterOptions = {}): GCodeSlice[] {
    const triangles: Triangle[] = [];
    let minimumZ = Number.POSITIVE_INFINITY;
    let maximumZ = Number.NEGATIVE_INFINITY;
    root.updateMatrixWorld(true, true, true);
    root.traverse((node) => {
      if (!(node instanceof Mesh && node.geometry)) return;
      const positions = node.geometry.getAttribute("position");
      if (!positions || positions.itemSize < 3) return;
      matrix.copy(node.matrixWorld);
      const transformed: GCodePoint[] = [];
      for (let index = 0; index < positions.count; index++) {
        point
          .set(
            positions.getX(index),
            positions.getY(index),
            positions.getZ(index),
          )
          .applyMatrix4(matrix);
        if (
          !(
            Number.isFinite(point.x) &&
            Number.isFinite(point.y) &&
            Number.isFinite(point.z)
          )
        )
          return;
        const value = { x: point.x, y: point.y, z: point.z };
        transformed.push(value);
        minimumZ = Math.min(minimumZ, value.z);
        maximumZ = Math.max(maximumZ, value.z);
      }
      const index = node.geometry.index;
      if (index) {
        for (let cursor = 0; cursor + 2 < index.length; cursor += 3) {
          const first = transformed[index[cursor]!];
          const second = transformed[index[cursor + 1]!];
          const third = transformed[index[cursor + 2]!];
          if (first && second && third)
            triangles.push({ first, second, third });
        }
      } else {
        for (let cursor = 0; cursor + 2 < transformed.length; cursor += 3) {
          triangles.push({
            first: transformed[cursor]!,
            second: transformed[cursor + 1]!,
            third: transformed[cursor + 2]!,
          });
        }
      }
    });
    const heights = makeLayerHeights(minimumZ, maximumZ, options);
    const scale = finitePositive(options.scale, 1);
    return heights.map((height) => {
      const segments: Segment[] = [];
      for (const triangle of triangles) {
        const segment = intersectTriangle(triangle, height);
        if (segment) segments.push(scaleSegment(segment, scale));
      }
      return { z: height * scale, paths: connectSegments(segments) };
    });
  }

  /** Converts a mesh hierarchy to deterministic G-code text. */
  parse(root: Node, options: GCodeExporterOptions = {}): string {
    return this.parseSlices(this.slice(root, options), options);
  }

  /** Converts precomputed CPU slices to deterministic G-code text. */
  parseSlices(
    slices: readonly GCodeSlice[],
    options: GCodeExporterOptions = {},
  ): string {
    const precision = integerInRange(options.precision, 0, 9, 3);
    const format = (value: number): string => formatNumber(value, precision);
    const units = options.units ?? "mm";
    const travelFeedRate = finitePositive(options.travelFeedRate, 3000);
    const printFeedRate = finitePositive(options.printFeedRate, 1200);
    const extrusionPerUnit = finitePositiveOrZero(options.extrusionPerUnit, 0);
    const lines: string[] = [];
    if (options.includeHeader !== false) {
      lines.push(
        "; EASEL G-code export",
        units === "inch" ? "G20 ; inches" : "G21 ; millimeters",
        "G90 ; absolute positioning",
      );
      if (extrusionPerUnit > 0) lines.push("M82 ; absolute extrusion");
    }
    let extrusion = 0;
    const orderedSlices = [...slices].sort(
      (first, second) => first.z - second.z,
    );
    for (let layerIndex = 0; layerIndex < orderedSlices.length; layerIndex++) {
      const layer = orderedSlices[layerIndex]!;
      if (layer.paths.length === 0) continue;
      lines.push(`; layer ${layerIndex} z=${format(layer.z)}`);
      for (const path of layer.paths) {
        if (path.points.length < 2) continue;
        const first = path.points[0]!;
        lines.push(
          `G0 X${format(first.x)} Y${format(first.y)} Z${format(first.z)} F${format(travelFeedRate)}`,
        );
        let previous = first;
        for (
          let pointIndex = 1;
          pointIndex < path.points.length;
          pointIndex++
        ) {
          const next = path.points[pointIndex]!;
          const move = [`G1 X${format(next.x)}`, `Y${format(next.y)}`];
          if (extrusionPerUnit > 0) {
            extrusion += distance(previous, next) * extrusionPerUnit;
            move.push(`E${format(extrusion)}`);
          }
          move.push(`F${format(printFeedRate)}`);
          lines.push(move.join(" "));
          previous = next;
        }
      }
    }
    if (options.includeFooter !== false) lines.push("M2 ; end of program");
    return `${lines.join("\n")}\n`;
  }
}

function makeLayerHeights(
  minimumZ: number,
  maximumZ: number,
  options: GCodeExporterOptions,
): number[] {
  if (
    !(Number.isFinite(minimumZ) && Number.isFinite(maximumZ)) ||
    maximumZ < minimumZ
  )
    return [];
  if (options.layers) {
    return [...new Set(options.layers.filter(Number.isFinite))].sort(
      (first, second) => first - second,
    );
  }
  const layerHeight = finitePositive(options.layerHeight, 0.2);
  const heights: number[] = [];
  for (
    let height = minimumZ + layerHeight / 2;
    height < maximumZ - epsilon;
    height += layerHeight
  )
    heights.push(height);
  return heights;
}

function intersectTriangle(
  triangle: Triangle,
  height: number,
): Segment | undefined {
  const points: GCodePoint[] = [];
  const vertices = [triangle.first, triangle.second, triangle.third];
  for (let index = 0; index < 3; index++) {
    const first = vertices[index]!;
    const second = vertices[(index + 1) % 3]!;
    const firstDistance = first.z - height;
    const secondDistance = second.z - height;
    if (Math.abs(firstDistance) <= epsilon) addUnique(points, first);
    if (
      (firstDistance < -epsilon && secondDistance > epsilon) ||
      (firstDistance > epsilon && secondDistance < -epsilon)
    ) {
      const ratio = firstDistance / (firstDistance - secondDistance);
      addUnique(points, {
        x: first.x + (second.x - first.x) * ratio,
        y: first.y + (second.y - first.y) * ratio,
        z: height,
      });
    }
  }
  if (points.length < 2) return;
  if (points.length > 2) points.sort(comparePoints);
  return { first: points[0]!, second: points[points.length - 1]! };
}

function connectSegments(segments: Segment[]): GCodePath[] {
  const unique = new Map<string, Segment>();
  for (const segment of segments) {
    if (distance(segment.first, segment.second) <= epsilon) continue;
    const [first, second] =
      comparePoints(segment.first, segment.second) <= 0
        ? [segment.first, segment.second]
        : [segment.second, segment.first];
    unique.set(`${pointKey(first)}:${pointKey(second)}`, { first, second });
  }
  const remaining = [...unique.values()].sort(
    (first, second) =>
      comparePoints(first.first, second.first) ||
      comparePoints(first.second, second.second),
  );
  const paths: GCodePath[] = [];
  while (remaining.length > 0) {
    const segment = remaining.shift()!;
    const points = [segment.first, segment.second];
    let endpoint = segment.second;
    for (;;) {
      const nextIndex = findConnectedSegmentIndex(remaining, endpoint);
      if (nextIndex < 0) break;
      const next = remaining.splice(nextIndex, 1)[0]!;
      const nextPoint =
        pointKey(next.first) === pointKey(endpoint) ? next.second : next.first;
      points.push(nextPoint);
      endpoint = nextPoint;
      if (pointKey(endpoint) === pointKey(points[0]!)) break;
    }
    paths.push({ points: simplifyPath(points) });
  }
  return paths;
}

function findConnectedSegmentIndex(
  segments: readonly Segment[],
  endpoint: GCodePoint,
): number {
  const key = pointKey(endpoint);
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]!;
    if (pointKey(segment.first) === key || pointKey(segment.second) === key)
      return index;
  }
  return -1;
}

function simplifyPath(points: GCodePoint[]): GCodePoint[] {
  if (points.length < 3) return points;
  const simplified: GCodePoint[] = [points[0]!];
  for (let index = 1; index < points.length - 1; index++) {
    const previous = simplified[simplified.length - 1]!;
    const current = points[index]!;
    const next = points[index + 1]!;
    const cross =
      (current.x - previous.x) * (next.y - current.y) -
      (current.y - previous.y) * (next.x - current.x);
    if (
      Math.abs(cross) > epsilon ||
      distance(previous, current) <= epsilon ||
      distance(current, next) <= epsilon
    )
      simplified.push(current);
  }
  simplified.push(points[points.length - 1]!);
  return simplified;
}

function scaleSegment(segment: Segment, scale: number): Segment {
  return {
    first: {
      x: segment.first.x * scale,
      y: segment.first.y * scale,
      z: segment.first.z * scale,
    },
    second: {
      x: segment.second.x * scale,
      y: segment.second.y * scale,
      z: segment.second.z * scale,
    },
  };
}

function addUnique(points: GCodePoint[], candidate: GCodePoint): void {
  if (!points.some((point) => distance(point, candidate) <= epsilon))
    points.push({ x: candidate.x, y: candidate.y, z: candidate.z });
}

function comparePoints(first: GCodePoint, second: GCodePoint): number {
  return first.x - second.x || first.y - second.y || first.z - second.z;
}

function pointKey(point: GCodePoint): string {
  return `${Math.round(point.x / epsilon)}:${Math.round(point.y / epsilon)}:${Math.round(point.z / epsilon)}`;
}

function distance(first: GCodePoint, second: GCodePoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
}

function finitePositive(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function finitePositiveOrZero(
  value: number | undefined,
  fallback: number,
): number {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function integerInRange(
  value: number | undefined,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function formatNumber(value: number, precision: number): string {
  return Number.isFinite(value)
    ? String(Number(value.toFixed(precision)))
    : "0";
}

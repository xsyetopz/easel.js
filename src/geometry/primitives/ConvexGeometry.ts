import { Vector3 } from "../../math/Vector3.ts";
import { Geometry } from "../Geometry.ts";

type HullPoint = {
  point: Vector3;
  x: number;
  y: number;
};

type HullPlane = {
  normal: Vector3;
  distance: number;
  points: Map<number, Vector3>;
};

type SupportingPlane = {
  normal: Vector3;
  anchor: Vector3;
};

type TriangleIndices = {
  a: number;
  b: number;
  c: number;
};

const _edgeA = new Vector3();
const _edgeB = new Vector3();
const _normal = new Vector3();
const _u = new Vector3();
const _v = new Vector3();

/**
 * CPU convex hull geometry for a set of three-dimensional points.
 *
 * The hull is emitted as non-indexed triangles with one normal per face,
 * matching the shape produced by three.js' `ConvexGeometry` addon. Hull
 * construction is deliberately CPU-only and does not require a renderer.
 */
export class ConvexGeometry extends Geometry {
  /** Serialization discriminator for this runtime type. */
  declare type: string;
  /** Primitive-construction parameters retained for serialization. */
  declare parameters: Record<string, unknown>;

  /** Constructs a convex hull around the supplied points. */
  constructor(points: readonly Vector3[] = []) {
    super();

    this.type = "ConvexGeometry";
    this.parameters = {
      points: points.map((point) => [point.x, point.y, point.z]),
    };

    const unique = uniquePoints(points);
    const { positions, normals } = buildHull(unique);

    this.setPositions(new Float32Array(positions));
    this.setNormals(new Float32Array(normals));
    this.computeBoundingBox();
    this.computeBoundingSphere();
  }
}

function buildHull(points: readonly Vector3[]): {
  positions: number[];
  normals: number[];
} {
  const scale = coordinateScale(points);
  const epsilon = 1e-8 * scale;
  const planes = supportingPlanes(points, scale, epsilon);
  const positions: number[] = [];
  const normals: number[] = [];

  for (const plane of planes.values()) {
    const polygon = planarHull(
      [...plane.points.values()],
      plane.normal,
      epsilon,
    );
    for (let index = 1; index < polygon.length - 1; index++) {
      pushVertex(polygon[0], plane.normal, positions, normals);
      pushVertex(polygon[index], plane.normal, positions, normals);
      pushVertex(polygon[index + 1], plane.normal, positions, normals);
    }
  }
  return { positions, normals };
}

function supportingPlanes(
  points: readonly Vector3[],
  scale: number,
  epsilon: number,
): Map<string, HullPlane> {
  const planes = new Map<string, HullPlane>();
  for (let a = 0; a < points.length - 2; a++) {
    for (let b = a + 1; b < points.length - 1; b++) {
      for (let c = b + 1; c < points.length; c++) {
        const candidate = supportingNormal(points, { a, b, c }, scale, epsilon);
        if (candidate) addPlane(planes, points, candidate, epsilon);
      }
    }
  }
  return planes;
}

function supportingNormal(
  points: readonly Vector3[],
  indices: TriangleIndices,
  scale: number,
  epsilon: number,
): SupportingPlane | undefined {
  const { a, b, c } = indices;
  _edgeA.subVectors(points[b], points[a]);
  _edgeB.subVectors(points[c], points[a]);
  _normal.crossVectors(_edgeA, _edgeB);
  const normalLength = _normal.length;
  if (normalLength <= 1e-12 * scale * scale) return;
  _normal.multiplyScalar(1 / normalLength);

  let hasPositive = false;
  let hasNegative = false;
  for (const point of points) {
    const signed = _normal.dot(point) - _normal.dot(points[a]);
    if (signed > epsilon) hasPositive = true;
    if (signed < -epsilon) hasNegative = true;
    if (hasPositive && hasNegative) return;
  }
  if (!(hasPositive || hasNegative)) return;
  if (hasPositive) _normal.negate();
  return { normal: _normal.clone(), anchor: points[a] };
}

function addPlane(
  planes: Map<string, HullPlane>,
  points: readonly Vector3[],
  candidate: SupportingPlane,
  epsilon: number,
): void {
  const { normal, anchor } = candidate;
  const distance = -normal.dot(anchor);
  const key = planeKey(normal, distance, epsilon);
  let plane = planes.get(key);
  if (!plane) {
    plane = { normal, distance, points: new Map() };
    planes.set(key, plane);
  }
  for (let index = 0; index < points.length; index++) {
    if (Math.abs(plane.normal.dot(points[index]) + plane.distance) <= epsilon) {
      plane.points.set(index, points[index]);
    }
  }
}

function uniquePoints(points: readonly Vector3[]): Vector3[] {
  if (points.length === 0) return [];
  let scale = 1;
  for (const point of points) {
    scale = Math.max(
      scale,
      Math.abs(point.x),
      Math.abs(point.y),
      Math.abs(point.z),
    );
  }
  const quantum = 1e-10 * scale;
  const seen = new Set<string>();
  const unique: Vector3[] = [];
  for (const point of points) {
    const key = `${Math.round(point.x / quantum)},${Math.round(point.y / quantum)},${Math.round(point.z / quantum)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(point.clone());
  }
  return unique;
}

function coordinateScale(points: readonly Vector3[]): number {
  let scale = 1;
  for (const point of points) {
    scale = Math.max(
      scale,
      Math.abs(point.x),
      Math.abs(point.y),
      Math.abs(point.z),
    );
  }
  return scale;
}

function planeKey(normal: Vector3, distance: number, epsilon: number): string {
  const distanceQuantum = Math.max(epsilon, 1e-10);
  return `${Math.round(normal.x / 1e-8)},${Math.round(normal.y / 1e-8)},${Math.round(normal.z / 1e-8)},${Math.round(distance / distanceQuantum)}`;
}

function planarHull(
  points: Vector3[],
  normal: Vector3,
  epsilon: number,
): Vector3[] {
  if (points.length < 3) return [];

  // Choose a stable basis in the supporting plane, then project to 2D.
  let helper: Vector3;
  if (Math.abs(normal.x) < 0.8) helper = new Vector3(1, 0, 0);
  else if (Math.abs(normal.y) < 0.8) helper = new Vector3(0, 1, 0);
  else helper = new Vector3(0, 0, 1);
  _u.crossVectors(helper, normal).normalize();
  _v.crossVectors(normal, _u).normalize();
  const projected: HullPoint[] = points.map((point) => ({
    point,
    x: _u.dot(point),
    y: _v.dot(point),
  }));
  projected.sort((left, right) => left.x - right.x || left.y - right.y);

  return convexHull2D(projected, epsilon).map(({ point }) => point);
}

function convexHull2D(points: HullPoint[], epsilon: number): HullPoint[] {
  const lower = hullChain(points, epsilon);
  const upper = hullChain([...points].reverse(), epsilon);
  lower.pop();
  upper.pop();
  const hull = [...lower, ...upper];
  return hull.length >= 3 ? [...lower, ...upper] : [];
}

function hullChain(points: HullPoint[], epsilon: number): HullPoint[] {
  const cross = (a: HullPoint, b: HullPoint, c: HullPoint): number =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const chain: HullPoint[] = [];
  for (const point of points) {
    while (chain.length >= 2) {
      const previous = chain.at(-2);
      const current = chain.at(-1);
      if (!(previous && current) || cross(previous, current, point) > epsilon)
        break;
      chain.pop();
    }
    chain.push(point);
  }
  return chain;
}

function pushVertex(
  point: Vector3,
  normal: Vector3,
  positions: number[],
  normals: number[],
): void {
  positions.push(point.x, point.y, point.z);
  normals.push(normal.x, normal.y, normal.z);
}

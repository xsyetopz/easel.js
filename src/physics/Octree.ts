import type { Node } from "../core/Node.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import { Box3 } from "../math/Box3.ts";
import type { Capsule } from "../math/Capsule.ts";
import type { Matrix4 } from "../math/Matrix4.ts";
import { Plane } from "../math/Plane.ts";
import { Triangle } from "../math/Triangle.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Mesh } from "../objects/Mesh.ts";

const EPSILON = 1e-10;

/** Collision result returned by {@link Octree.capsuleIntersect}. */
export interface CapsuleIntersection {
  /** Unit direction that moves the capsule out of the intersecting primitive. */
  readonly normal: Vector3;
  /** Minimum translation distance along {@link normal}. */
  readonly depth: number;
}

/** Collision result for a capsule against one indexed triangle. */
export interface TriangleCapsuleIntersection extends CapsuleIntersection {
  /** Closest point on the indexed triangle. */
  readonly point: Vector3;
}

/** Options controlling geometry extraction in {@link Octree.fromGraphNode}. */
export interface OctreeGraphOptions {
  /** Index transformed mesh triangles; defaults to `true`. */
  readonly triangles?: boolean;
  /** Retain transformed mesh bounds for {@link Octree.boxes}; defaults to `true`. */
  readonly boxes?: boolean;
}

interface TriangleRecord {
  readonly triangle: Triangle;
  readonly bounds: Box3;
}

interface OctreeNode {
  readonly box: Box3;
  readonly records: TriangleRecord[];
  readonly children: OctreeNode[];
}

interface BoxRecord {
  readonly box: Box3;
  readonly generated: boolean;
}

/** CPU triangle spatial index for game and physics collision helpers.
 *
 * The index accepts both legacy axis-aligned boxes and transformed CPU
 * triangles. Triangle queries use a deterministic octree broad phase followed
 * by exact segment/triangle closest-point tests; no GPU or device API is used.
 */
export class Octree {
  /** Number of triangles retained by a leaf before it is subdivided. */
  trianglesPerLeaf = 8;
  /** Maximum subdivision depth used by {@link build}. */
  maxLevel = 16;

  /** Bounds of all indexed triangles before the build margin is applied. */
  readonly bounds: Box3 = new Box3();
  /** Root bounds used by the broad-phase tree, or `undefined` when empty. */
  box: Box3 | undefined;

  readonly #boxes: Box3[] = [];
  readonly #boxRecords: BoxRecord[] = [];
  readonly #triangles: Triangle[] = [];
  readonly #triangleRecords: TriangleRecord[] = [];
  #tree: OctreeNode | undefined;

  /** Constructs an empty index, optionally constrained to an initial box. */
  constructor(box?: Box3) {
    this.box = box?.clone();
  }

  /** Read-only collision boxes currently stored in the index. */
  get boxes(): readonly Box3[] {
    return this.#boxes;
  }

  /** Read-only view of the copied world-space triangles currently indexed. */
  get triangles(): readonly Triangle[] {
    return this.#triangles;
  }

  /** Removes all indexed collision boxes and triangles. */
  clear(): this {
    this.#boxes.length = 0;
    this.#boxRecords.length = 0;
    this.#triangles.length = 0;
    this.#triangleRecords.length = 0;
    this.bounds.makeEmpty();
    this.box = undefined;
    this.#tree = undefined;
    return this;
  }

  /** Adds a copied world-space axis-aligned collision box. */
  addBox(box: Box3): this {
    if (box.isEmpty) return this;
    const copy = box.clone();
    this.#boxes.push(copy);
    this.#boxRecords.push({ box: copy, generated: false });
    return this;
  }

  /** Adds a copied world-space triangle to the CPU spatial index. */
  addTriangle(triangle: Triangle): this {
    const copy = triangle.clone();
    const bounds = triangleBounds(copy);
    this.#triangles.push(copy);
    this.#triangleRecords.push({ triangle: copy, bounds });
    this.bounds.union(bounds);
    this.box = undefined;
    this.#tree = undefined;
    return this;
  }

  /** Computes the root box and recursively partitions indexed triangles. */
  build(): this {
    if (this.#triangleRecords.length === 0) {
      this.#tree = undefined;
      if (this.bounds.isEmpty) this.box = undefined;
      return this;
    }

    if (!this.box || this.box.isEmpty) {
      this.box = this.bounds.clone().expandByScalar(0.01);
    }
    const records = this.#triangleRecords.slice();
    this.#tree = this.#buildNode(this.box, records, 0);
    return this;
  }

  /** Recomputes the root box from triangle bounds without building children. */
  calcBox(): this {
    this.box = this.bounds.isEmpty
      ? undefined
      : this.bounds.clone().expandByScalar(0.01);
    return this;
  }

  /** Builds collision primitives from visible mesh geometry in a node hierarchy.
   *
   * Indexed and non-indexed position data are read on the CPU, transformed by
   * each mesh's `matrixWorld`, and added as world-space triangles. Bounds are
   * retained by default so existing `boxes` and `findBox` callers continue to
   * work. Set `triangles: false` to request the legacy AABB-only path.
   */
  fromGraphNode(root: Node, options: OctreeGraphOptions = {}): this {
    this.clear();
    const includeTriangles = options.triangles !== false;
    const includeBoxes = options.boxes !== false;
    root.updateMatrixWorld(true, true);
    root.traverse((node) => {
      if (!(node instanceof Mesh && node.visible && node.geometry)) return;
      const geometry = node.geometry;
      if (includeBoxes) this.#addGraphBox(geometry, node.matrixWorld);
      if (!includeTriangles) return;
      this.#addGraphTriangles(geometry, node);
    });
    return this.build();
  }

  /** Returns the first indexed box containing the supplied point. */
  findBox(point: Vector3): Box3 | undefined {
    return this.#boxes.find((box) => box.containsPoint(point));
  }

  /** Appends unique triangles whose bounds may overlap a capsule. */
  getCapsuleTriangles(capsule: Capsule, target: Triangle[] = []): Triangle[] {
    const query = capsuleBounds(capsule);
    const seen = new Set(target);
    this.#queryTriangles(query, this.#tree, target, seen);
    return target;
  }

  /** Computes one exact capsule/triangle intersection using CPU geometry. */
  triangleCapsuleIntersect(
    capsule: Capsule,
    triangle: Triangle,
  ): TriangleCapsuleIntersection | false {
    return triangleCapsuleIntersect(capsule, triangle);
  }

  /** Resolves the shallowest capsule overlap and moves the capsule out.
   *
   * Explicit boxes retain the original AABB behavior. Graph-generated boxes
   * are used as a fallback only when no triangle data was indexed, preventing
   * coarse bounds from producing false collisions for triangle meshes.
   */
  capsuleIntersect(capsule: Capsule): CapsuleIntersection | false {
    if (this.#triangles.length === 0) {
      return this.#capsuleIntersectBoxes(capsule, false);
    }

    const originalCenter = capsule.getCenter(_originalCenter).clone();
    const working = capsule.clone();
    const candidates = this.getCapsuleTriangles(working);
    let hit = false;
    let lastNormal: Vector3 | undefined;
    for (const triangle of candidates) {
      const intersection = triangleCapsuleIntersect(working, triangle);
      if (!intersection) continue;
      hit = true;
      lastNormal = intersection.normal;
      working.translate(
        _translation
          .copy(intersection.normal)
          .multiplyScalar(intersection.depth),
      );
    }

    // A caller may explicitly combine box and triangle primitives. Generated
    // graph bounds are skipped here because the exact triangles already cover
    // that mesh; manually added boxes remain part of the collision world.
    const boxHit = this.#capsuleIntersectBoxes(working, true);
    if (boxHit) {
      hit = true;
      lastNormal = boxHit.normal;
    }

    if (!hit) return false;
    const collisionVector = working
      .getCenter(_workingCenter)
      .sub(originalCenter);
    const depth = collisionVector.length;
    const normal =
      depth > EPSILON
        ? collisionVector.clone().multiplyScalar(1 / depth)
        : (lastNormal?.clone() ?? _yNormal.clone());
    capsule.copy(working);
    return { normal, depth };
  }

  #addGraphBox(geometry: Geometry, matrixWorld: Matrix4): void {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox || geometry.boundingBox.isEmpty) return;
    const copy = geometry.boundingBox.clone().applyMatrix4(matrixWorld);
    if (copy.isEmpty) return;
    this.#boxes.push(copy);
    this.#boxRecords.push({ box: copy, generated: true });
  }

  #addGraphTriangles(geometry: Geometry, node: Mesh): void {
    const position = geometry.getAttribute("position");
    if (!position || position.itemSize < 3 || position.count < 3) return;
    const index = geometry.index;
    const start = Math.max(0, Math.floor(geometry.drawRange.start));
    const drawCount = Number.isFinite(geometry.drawRange.count)
      ? Math.max(0, Math.floor(geometry.drawRange.count))
      : Number.POSITIVE_INFINITY;
    const end = index
      ? Math.min(index.length, start + drawCount)
      : Math.min(position.count, start + drawCount);
    const matrixWorld = node.matrixWorld;
    for (let offset = start; offset + 2 < end; offset += 3) {
      const ia = index ? index[offset] : offset;
      const ib = index ? index[offset + 1] : offset + 1;
      const ic = index ? index[offset + 2] : offset + 2;
      if (
        ia === undefined ||
        ib === undefined ||
        ic === undefined ||
        ia >= position.count ||
        ib >= position.count ||
        ic >= position.count
      )
        continue;
      const a = readVertex(node, position, ia).applyMatrix4(matrixWorld);
      const b = readVertex(node, position, ib).applyMatrix4(matrixWorld);
      const c = readVertex(node, position, ic).applyMatrix4(matrixWorld);
      this.addTriangle(new Triangle(a, b, c));
    }
  }

  #buildNode(box: Box3, records: TriangleRecord[], level: number): OctreeNode {
    if (
      records.length <= this.trianglesPerLeaf ||
      level >= this.maxLevel ||
      box.isEmpty
    ) {
      return { box, records, children: [] };
    }

    const halfSize = box.size.multiplyScalar(0.5);
    if (halfSize.lengthSq <= EPSILON) {
      return { box, records, children: [] };
    }
    const children: OctreeNode[] = [];
    let distributed = false;
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          const min = new Vector3(
            box.min.x + halfSize.x * x,
            box.min.y + halfSize.y * y,
            box.min.z + halfSize.z * z,
          );
          const childBox = new Box3(min, min.clone().add(halfSize));
          const childRecords = records.filter((record) =>
            childBox.intersectsBox(record.bounds),
          );
          if (childRecords.length === 0) continue;
          distributed = true;
          children.push(this.#buildNode(childBox, childRecords, level + 1));
        }
      }
    }
    const largestChild = children.reduce(
      (largest, child) => Math.max(largest, child.records.length),
      0,
    );
    if (!distributed || largestChild === records.length) {
      return { box, records, children: [] };
    }
    return { box, records: [], children };
  }

  #queryTriangles(
    query: Box3,
    node: OctreeNode | undefined,
    target: Triangle[],
    seen: Set<Triangle>,
  ): void {
    if (!node) {
      for (const record of this.#triangleRecords) {
        if (query.intersectsBox(record.bounds) && !seen.has(record.triangle)) {
          seen.add(record.triangle);
          target.push(record.triangle);
        }
      }
      return;
    }
    if (!query.intersectsBox(node.box)) return;
    if (node.children.length === 0) {
      for (const record of node.records) {
        if (query.intersectsBox(record.bounds) && !seen.has(record.triangle)) {
          seen.add(record.triangle);
          target.push(record.triangle);
        }
      }
      return;
    }
    for (const child of node.children)
      this.#queryTriangles(query, child, target, seen);
  }

  #capsuleIntersectBoxes(
    capsule: Capsule,
    skipGenerated: boolean,
  ): CapsuleIntersection | false {
    let result: CapsuleIntersection | false = false;
    for (const record of this.#boxRecords) {
      if (skipGenerated && record.generated) continue;
      const box = record.box;
      if (!capsule.intersectsBox(box)) continue;
      capsule.getCenter(_center);
      _probe.copy(_center);
      const startDistance = box.distanceToPoint(capsule.start);
      const endDistance = box.distanceToPoint(capsule.end);
      const centerDistance = box.distanceToPoint(_center);
      if (startDistance < centerDistance && startDistance <= endDistance) {
        _probe.copy(capsule.start);
      } else if (endDistance < centerDistance) {
        _probe.copy(capsule.end);
      } else {
        _probe.clamp(box.min, box.max);
      }
      const expanded = box.clone().expandByScalar(capsule.radius);
      const distances = [
        { normal: _xNormal, depth: expanded.max.x - _probe.x },
        { normal: _xNegative, depth: _probe.x - expanded.min.x },
        { normal: _yNormal, depth: expanded.max.y - _probe.y },
        { normal: _yNegative, depth: _probe.y - expanded.min.y },
        { normal: _zNormal, depth: expanded.max.z - _probe.z },
        { normal: _zNegative, depth: _probe.z - expanded.min.z },
      ].filter((candidate) => candidate.depth >= 0);
      const shallowest = distances.sort(
        (left, right) => left.depth - right.depth,
      )[0];
      if (!shallowest || (result && shallowest.depth >= result.depth)) continue;
      result = { normal: shallowest.normal.clone(), depth: shallowest.depth };
    }
    if (result) {
      capsule.translate(
        _translation.copy(result.normal).multiplyScalar(result.depth),
      );
    }
    return result;
  }
}

function triangleCapsuleIntersect(
  capsule: Capsule,
  triangle: Triangle,
): TriangleCapsuleIntersection | false {
  if (triangle.area <= EPSILON) return false;
  const plane = triangle.getPlane(_plane);
  const segmentHit = segmentTriangleIntersection(
    capsule.start,
    capsule.end,
    triangle,
  );
  const pointOnSegment = new Vector3();
  const pointOnTriangle = new Vector3();
  let distance = Number.POSITIVE_INFINITY;
  if (segmentHit) {
    pointOnSegment.copy(segmentHit);
    pointOnTriangle.copy(segmentHit);
    distance = 0;
  } else {
    const endpointCandidates = [capsule.start, capsule.end];
    for (const endpoint of endpointCandidates) {
      const closest = triangle.closestPointToPoint(
        endpoint,
        _candidateTriangle,
      );
      const candidateDistance = endpoint.distanceTo(closest);
      if (candidateDistance < distance) {
        distance = candidateDistance;
        pointOnSegment.copy(endpoint);
        pointOnTriangle.copy(closest);
      }
    }
    const edges: readonly [Vector3, Vector3][] = [
      [triangle.a, triangle.b],
      [triangle.b, triangle.c],
      [triangle.c, triangle.a],
    ];
    for (const [edgeStart, edgeEnd] of edges) {
      closestSegmentSegment(
        capsule.start,
        capsule.end,
        edgeStart,
        edgeEnd,
        _segmentPoint,
        _trianglePoint,
      );
      const candidateDistance = _segmentPoint.distanceTo(_trianglePoint);
      if (candidateDistance < distance) {
        distance = candidateDistance;
        pointOnSegment.copy(_segmentPoint);
        pointOnTriangle.copy(_trianglePoint);
      }
    }
  }
  if (distance > capsule.radius + EPSILON) return false;
  const normal = pointOnSegment.clone().sub(pointOnTriangle);
  if (normal.lengthSq > EPSILON) {
    normal.normalize();
  } else {
    normal.copy(plane.normal);
    capsule.getCenter(_center);
    if (normal.dot(_center.clone().sub(pointOnTriangle)) < 0) normal.negate();
  }
  return {
    normal,
    point: pointOnTriangle.clone(),
    depth: Math.max(0, capsule.radius - distance),
  };
}

function closestSegmentSegment(
  start1: Vector3,
  end1: Vector3,
  start2: Vector3,
  end2: Vector3,
  target1: Vector3,
  target2: Vector3,
): void {
  const r = _r.copy(end1).sub(start1);
  const s = _s.copy(end2).sub(start2);
  const w = _w.copy(start2).sub(start1);
  const a = r.dot(r);
  const e = s.dot(s);
  const f = s.dot(w);
  let t = 0;
  let u = 0;
  if (a <= EPSILON && e <= EPSILON) {
    target1.copy(start1);
    target2.copy(start2);
    return;
  }
  if (a <= EPSILON) {
    u = clamp01(f / e);
  } else {
    const c = r.dot(w);
    if (e <= EPSILON) {
      t = clamp01(-c / a);
    } else {
      const b = r.dot(s);
      const denominator = a * e - b * b;
      if (Math.abs(denominator) > EPSILON)
        t = clamp01((b * f - c * e) / denominator);
      const tNumerator = b * t + f;
      if (tNumerator <= 0) {
        t = 0;
        u = clamp01(f / e);
      } else if (tNumerator >= e) {
        t = 1;
        u = clamp01((b + f) / e);
      } else {
        u = tNumerator / e;
      }
    }
  }
  target1.copy(r).multiplyScalar(t).add(start1);
  target2.copy(s).multiplyScalar(u).add(start2);
}

function segmentTriangleIntersection(
  start: Vector3,
  end: Vector3,
  triangle: Triangle,
): Vector3 | false {
  const direction = _direction.copy(end).sub(start);
  const edge1 = _edge1.copy(triangle.b).sub(triangle.a);
  const edge2 = _edge2.copy(triangle.c).sub(triangle.a);
  const p = _p.crossVectors(direction, edge2);
  const determinant = edge1.dot(p);
  if (Math.abs(determinant) <= EPSILON) return false;
  const inverse = 1 / determinant;
  const tVector = _tVector.copy(start).sub(triangle.a);
  const u = tVector.dot(p) * inverse;
  if (u < -EPSILON || u > 1 + EPSILON) return false;
  const q = _q.crossVectors(tVector, edge1);
  const v = direction.dot(q) * inverse;
  if (v < -EPSILON || u + v > 1 + EPSILON) return false;
  const t = edge2.dot(q) * inverse;
  if (t < -EPSILON || t > 1 + EPSILON) return false;
  return _intersection
    .copy(direction)
    .multiplyScalar(clamp01(t))
    .add(start)
    .clone();
}

function readVertex(
  node: Mesh,
  position: {
    getX: (index: number) => number;
    getY: (index: number) => number;
    getZ: (index: number) => number;
  },
  index: number,
): Vector3 {
  if (typeof node.getVertexPosition === "function") {
    return node.getVertexPosition(index, _vertex).clone();
  }
  return _vertex
    .set(position.getX(index), position.getY(index), position.getZ(index))
    .clone();
}

function triangleBounds(triangle: Triangle): Box3 {
  return new Box3().setFromPoints([triangle.a, triangle.b, triangle.c]);
}

function capsuleBounds(capsule: Capsule): Box3 {
  const min = new Vector3(
    Math.min(capsule.start.x, capsule.end.x) - capsule.radius,
    Math.min(capsule.start.y, capsule.end.y) - capsule.radius,
    Math.min(capsule.start.z, capsule.end.z) - capsule.radius,
  );
  const max = new Vector3(
    Math.max(capsule.start.x, capsule.end.x) + capsule.radius,
    Math.max(capsule.start.y, capsule.end.y) + capsule.radius,
    Math.max(capsule.start.z, capsule.end.z) + capsule.radius,
  );
  return new Box3(min, max);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

const _plane = new Plane();
const _candidateTriangle = new Vector3();
const _segmentPoint = new Vector3();
const _trianglePoint = new Vector3();
const _direction = new Vector3();
const _edge1 = new Vector3();
const _edge2 = new Vector3();
const _p = new Vector3();
const _q = new Vector3();
const _tVector = new Vector3();
const _intersection = new Vector3();
const _vertex = new Vector3();
const _r = new Vector3();
const _s = new Vector3();
const _w = new Vector3();
const _center = new Vector3();
const _originalCenter = new Vector3();
const _workingCenter = new Vector3();
const _probe = new Vector3();
const _translation = new Vector3();
const _xNormal = new Vector3(1, 0, 0);
const _xNegative = new Vector3(-1, 0, 0);
const _yNormal = new Vector3(0, 1, 0);
const _yNegative = new Vector3(0, -1, 0);
const _zNormal = new Vector3(0, 0, 1);
const _zNegative = new Vector3(0, 0, -1);

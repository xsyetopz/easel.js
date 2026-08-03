import { Ray } from "../math/Ray.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Layers } from "./Layers.ts";

const _v0 = new Vector3();
const _v1 = new Vector3();
const _v2 = new Vector3();
const _intersectPoint = new Vector3();
const _segStart = new Vector3();
const _segEnd = new Vector3();
const _closestPoint = new Vector3();

interface MatrixLike {
  elements: ArrayLike<number>;
}

interface PositionAttribute {
  getX: (i: number) => number;
  getY: (i: number) => number;
  getZ: (i: number) => number;
  count: number;
}

interface RaycastGeometry {
  getAttribute?: (name: string) => PositionAttribute | undefined;
  index?: ArrayLike<number> | { array: ArrayLike<number> } | undefined;
}

interface SceneObject {
  visible: boolean;
  layers: Layers;
  type?: string;
  geometry?: RaycastGeometry;
  matrixWorld: MatrixLike;
  children?: SceneObject[];
}

export interface Intersection {
  distance: number;
  point: Vector3;
  face: { a: number; b: number; c: number; normal: Vector3 | undefined };
  object: SceneObject;
}

interface LineIntersection {
  distance: number;
  point: Vector3;
  index: number;
  object: SceneObject;
}

type IntersectResult = Intersection | LineIntersection;

interface RaycastCamera {
  type: string;
  matrixWorld: MatrixLike;
  projectionMatrixInverse: MatrixLike;
  isOrthographic?: boolean;
}

/** Casts a ray into the scene to test intersections with objects. */
export class Raycaster {
  ray: Ray;

  near: number;

  far: number;

  camera: RaycastCamera | undefined;

  layers: Layers;

  /** Distance tolerance for Line and Points intersection tests. */
  threshold: number;

  constructor(
    origin: Vector3 = new Vector3(),
    direction: Vector3 = new Vector3(0, 0, -1),
    near = 0,
    far: number = Number.POSITIVE_INFINITY,
  ) {
    this.ray = new Ray(origin, direction);
    this.near = near;
    this.far = far;
    this.camera = undefined;
    this.layers = new Layers();
    this.threshold = 1;
  }

  set(origin: Vector3, direction: Vector3): this {
    this.ray.set(origin, direction);
    return this;
  }

  /** Sets the ray from a camera and normalized device coordinates. */
  setFromCamera(coords: { x: number; y: number }, camera: RaycastCamera): this {
    this.camera = camera;
    if (camera.type === "PerspectiveCamera") {
      this.ray.origin.setFromMatrixPosition(camera.matrixWorld);
      this.ray.direction
        .set(coords.x, coords.y, 0.5)
        .applyMatrix4(camera.projectionMatrixInverse)
        .applyMatrix4(camera.matrixWorld)
        .sub(this.ray.origin)
        .normalize();
    } else {
      // Orthographic
      this.ray.origin
        .set(coords.x, coords.y, -1)
        .applyMatrix4(camera.projectionMatrixInverse)
        .applyMatrix4(camera.matrixWorld);
      this.ray.direction
        .set(0, 0, -1)
        .applyMatrix4(camera.matrixWorld)
        .sub(_v0.setFromMatrixPosition(camera.matrixWorld))
        .normalize();
    }
    return this;
  }

  intersectObject(
    object: SceneObject,
    recursive = false,
    intersects: Intersection[] = [],
  ): Intersection[] {
    _intersectObject(object, this, intersects, recursive);
    intersects.sort(_ascSort);
    return intersects;
  }

  intersectObjects(
    objects: SceneObject[],
    recursive = false,
    intersects: Intersection[] = [],
  ): Intersection[] {
    for (const object of objects) {
      _intersectObject(object, this, intersects, recursive);
    }
    intersects.sort(_ascSort);
    return intersects;
  }
}

function _ascSort(a: { distance: number }, b: { distance: number }): number {
  return a.distance - b.distance;
}

function _intersectObject(
  object: SceneObject,
  raycaster: Raycaster,
  intersects: Intersection[],
  recursive: boolean,
): void {
  if (!object.visible) return;
  if (!raycaster.layers.test(object.layers)) return;

  if (object.type === "Mesh" && object.geometry) {
    _intersectMesh(object, object.geometry, raycaster, intersects);
  } else if (
    (object.type === "Line" ||
      object.type === "LineSegments" ||
      object.type === "LineLoop") &&
    object.geometry
  ) {
    _intersectLine(
      object,
      object.geometry,
      raycaster,
      intersects as unknown as IntersectResult[],
    );
  } else if (object.type === "Points" && object.geometry) {
    _intersectPoints(
      object,
      object.geometry,
      raycaster,
      intersects as unknown as IntersectResult[],
    );
  }

  if (recursive && object.children) {
    for (const child of object.children) {
      _intersectObject(child, raycaster, intersects, recursive);
    }
  }
}

/**
 * Normalize index to `{ array }` form. Geometry.index may return a raw typed
 * array or an object with an `.array` property.
 */
function _normalizeIndex(
  raw: ArrayLike<number> | { array: ArrayLike<number> } | undefined,
): { array: ArrayLike<number> } | undefined {
  if (!raw) return;
  if ("array" in raw) return raw as { array: ArrayLike<number> };
  return { array: raw };
}

function _intersectMesh(
  object: SceneObject,
  geometry: RaycastGeometry,
  raycaster: Raycaster,
  intersects: Intersection[],
): void {
  const position = geometry.getAttribute?.("position");
  if (!position) return;

  const index = _normalizeIndex(geometry.index);
  const matrixWorld = object.matrixWorld;
  const rayLocal = raycaster.ray
    .clone()
    .applyMatrix4(_invertMatrix4(matrixWorld));

  if (index) {
    _intersectIndexed(
      rayLocal,
      raycaster,
      position,
      index,
      matrixWorld,
      object,
      intersects,
    );
  } else {
    _intersectNonIndexed(
      rayLocal,
      raycaster,
      position,
      matrixWorld,
      object,
      intersects,
    );
  }
}

function _intersectIndexed(
  rayLocal: Ray,
  raycaster: Raycaster,
  position: PositionAttribute,
  index: { array: ArrayLike<number> },
  matrixWorld: MatrixLike,
  object: SceneObject,
  intersects: Intersection[],
): void {
  const indices = index.array;
  for (let i = 0, l = indices.length; i < l; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];

    _v0.set(position.getX(a), position.getY(a), position.getZ(a));
    _v1.set(position.getX(b), position.getY(b), position.getZ(b));
    _v2.set(position.getX(c), position.getY(c), position.getZ(c));

    const point = rayLocal.intersectTriangle(
      _v0,
      _v1,
      _v2,
      false,
      _intersectPoint,
    );
    if (point === undefined) continue;

    point.applyMatrix4(matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(point);
    if (distance < raycaster.near || distance > raycaster.far) continue;

    const e1x = _v1.x - _v0.x;
    const e1y = _v1.y - _v0.y;
    const e1z = _v1.z - _v0.z;
    const e2x = _v2.x - _v0.x;
    const e2y = _v2.y - _v0.y;
    const e2z = _v2.z - _v0.z;
    const normal = new Vector3(
      e1y * e2z - e1z * e2y,
      e1z * e2x - e1x * e2z,
      e1x * e2y - e1y * e2x,
    ).normalize();
    intersects.push({
      distance,
      point: point.clone(),
      face: { a, b, c, normal: normal.clone() },
      object,
    });
  }
}

function _intersectNonIndexed(
  rayLocal: Ray,
  raycaster: Raycaster,
  position: PositionAttribute,
  matrixWorld: MatrixLike,
  object: SceneObject,
  intersects: Intersection[],
): void {
  const count = position.count;
  for (let i = 0; i < count; i += 3) {
    _v0.set(position.getX(i), position.getY(i), position.getZ(i));
    _v1.set(position.getX(i + 1), position.getY(i + 1), position.getZ(i + 1));
    _v2.set(position.getX(i + 2), position.getY(i + 2), position.getZ(i + 2));

    const point = rayLocal.intersectTriangle(
      _v0,
      _v1,
      _v2,
      false,
      _intersectPoint,
    );
    if (point === undefined) continue;

    point.applyMatrix4(matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(point);
    if (distance < raycaster.near || distance > raycaster.far) continue;

    intersects.push({
      distance,
      point: point.clone(),
      face: { a: i, b: i + 1, c: i + 2, normal: undefined },
      object,
    });
  }
}

function _getWorldVertex(
  position: PositionAttribute,
  index: number,
  target: Vector3,
  matrixWorld: MatrixLike,
): Vector3 {
  return target
    .set(position.getX(index), position.getY(index), position.getZ(index))
    .applyMatrix4(matrixWorld);
}

function _intersectLine(
  object: SceneObject,
  geometry: RaycastGeometry,
  raycaster: Raycaster,
  intersects: IntersectResult[],
): void {
  const position = geometry.getAttribute?.("position");
  if (!position) return;

  const count = position.count;
  if (count < 2) return;

  const matrixWorld = object.matrixWorld;
  const threshold = raycaster.threshold;
  const thresholdSq = threshold * threshold;
  const ray = raycaster.ray;

  const isLoop = object.type === "LineLoop";
  const isSegments = object.type === "LineSegments";
  const step = isSegments ? 2 : 1;
  const end = isSegments ? count - 1 : count - 1;

  for (let i = 0; i < end; i += step) {
    _getWorldVertex(position, i, _segStart, matrixWorld);
    _getWorldVertex(position, i + 1, _segEnd, matrixWorld);

    const distSq = ray.distanceSqToSegment(
      _segStart,
      _segEnd,
      _intersectPoint,
      _closestPoint,
    );
    if (distSq > thresholdSq) continue;

    // Confirm the closest-point-on-ray is within [near, far].
    const distance = ray.origin.distanceTo(_intersectPoint);
    if (distance < raycaster.near || distance > raycaster.far) continue;

    intersects.push({
      distance,
      point: _closestPoint.clone(),
      index: i,
      object,
    });
  }

  // LineLoop: closing segment from last vertex back to first.
  if (isLoop && count >= 2) {
    _getWorldVertex(position, count - 1, _segStart, matrixWorld);
    _getWorldVertex(position, 0, _segEnd, matrixWorld);

    const distSq = ray.distanceSqToSegment(
      _segStart,
      _segEnd,
      _intersectPoint,
      _closestPoint,
    );
    if (distSq <= thresholdSq) {
      const distance = ray.origin.distanceTo(_intersectPoint);
      if (distance >= raycaster.near && distance <= raycaster.far) {
        intersects.push({
          distance,
          point: _closestPoint.clone(),
          index: count - 1,
          object,
        });
      }
    }
  }
}

function _intersectPoints(
  object: SceneObject,
  geometry: RaycastGeometry,
  raycaster: Raycaster,
  intersects: IntersectResult[],
): void {
  const position = geometry.getAttribute?.("position");
  if (!position) return;

  const count = position.count;
  const matrixWorld = object.matrixWorld;
  const threshold = raycaster.threshold;
  const ray = raycaster.ray;

  for (let i = 0; i < count; i++) {
    _getWorldVertex(position, i, _segStart, matrixWorld);

    const distance = ray.distanceToPoint(_segStart);
    if (distance > threshold) continue;

    const rayDistance = ray.origin.distanceTo(
      ray.closestPointToPoint(_segStart, _closestPoint),
    );
    if (rayDistance < raycaster.near || rayDistance > raycaster.far) continue;

    intersects.push({
      distance: rayDistance,
      point: _closestPoint.clone(),
      index: i,
      object,
    });
  }
}

/** Inverts a Matrix4 (returns a new object with inverted elements). */
function _invertMatrix4(m: MatrixLike): MatrixLike {
  const te = m.elements;
  const n11 = te[0];
  const n21 = te[1];
  const n31 = te[2];
  const n41 = te[3];
  const n12 = te[4];
  const n22 = te[5];
  const n32 = te[6];
  const n42 = te[7];
  const n13 = te[8];
  const n23 = te[9];
  const n33 = te[10];
  const n43 = te[11];
  const n14 = te[12];
  const n24 = te[13];
  const n34 = te[14];
  const n44 = te[15];

  const t11 =
    n23 * n34 * n42 -
    n24 * n33 * n42 +
    n24 * n32 * n43 -
    n22 * n34 * n43 -
    n23 * n32 * n44 +
    n22 * n33 * n44;
  const t12 =
    n14 * n33 * n42 -
    n13 * n34 * n42 -
    n14 * n32 * n43 +
    n12 * n34 * n43 +
    n13 * n32 * n44 -
    n12 * n33 * n44;
  const t13 =
    n13 * n24 * n42 -
    n14 * n23 * n42 +
    n14 * n22 * n43 -
    n12 * n24 * n43 -
    n13 * n22 * n44 +
    n12 * n23 * n44;
  const t14 =
    n14 * n23 * n32 -
    n13 * n24 * n32 -
    n14 * n22 * n33 +
    n12 * n24 * n33 +
    n13 * n22 * n34 -
    n12 * n23 * n34;

  const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
  if (det === 0) return m;

  const detInv = 1 / det;
  const result = new Float32Array(16);

  result[0] = t11 * detInv;
  result[1] =
    (n24 * n33 * n41 -
      n23 * n34 * n41 -
      n24 * n31 * n43 +
      n21 * n34 * n43 +
      n23 * n31 * n44 -
      n21 * n33 * n44) *
    detInv;
  result[2] =
    (n22 * n34 * n41 -
      n24 * n32 * n41 +
      n24 * n31 * n42 -
      n21 * n34 * n42 -
      n22 * n31 * n44 +
      n21 * n32 * n44) *
    detInv;
  result[3] =
    (n23 * n32 * n41 -
      n22 * n33 * n41 -
      n23 * n31 * n42 +
      n21 * n33 * n42 +
      n22 * n31 * n43 -
      n21 * n32 * n43) *
    detInv;
  result[4] = t12 * detInv;
  result[5] =
    (n13 * n34 * n41 -
      n14 * n33 * n41 +
      n14 * n31 * n43 -
      n11 * n34 * n43 -
      n13 * n31 * n44 +
      n11 * n33 * n44) *
    detInv;
  result[6] =
    (n14 * n32 * n41 -
      n12 * n34 * n41 -
      n14 * n31 * n42 +
      n11 * n34 * n42 +
      n12 * n31 * n44 -
      n11 * n32 * n44) *
    detInv;
  result[7] =
    (n12 * n33 * n41 -
      n13 * n32 * n41 +
      n13 * n31 * n42 -
      n11 * n33 * n42 -
      n12 * n31 * n43 +
      n11 * n32 * n43) *
    detInv;
  result[8] = t13 * detInv;
  result[9] =
    (n14 * n23 * n41 -
      n13 * n24 * n41 -
      n14 * n21 * n43 +
      n11 * n24 * n43 +
      n13 * n21 * n44 -
      n11 * n23 * n44) *
    detInv;
  result[10] =
    (n12 * n24 * n41 -
      n14 * n22 * n41 +
      n14 * n21 * n42 -
      n11 * n24 * n42 -
      n12 * n21 * n44 +
      n11 * n22 * n44) *
    detInv;
  result[11] =
    (n13 * n22 * n41 -
      n12 * n23 * n41 -
      n13 * n21 * n42 +
      n11 * n23 * n42 +
      n12 * n21 * n43 -
      n11 * n22 * n43) *
    detInv;
  result[12] = t14 * detInv;
  result[13] =
    (n13 * n24 * n31 -
      n14 * n23 * n31 +
      n14 * n21 * n33 -
      n11 * n24 * n33 -
      n13 * n21 * n34 +
      n11 * n23 * n34) *
    detInv;
  result[14] =
    (n14 * n22 * n31 -
      n12 * n24 * n31 -
      n14 * n21 * n32 +
      n11 * n24 * n32 +
      n12 * n21 * n34 -
      n11 * n22 * n34) *
    detInv;
  result[15] =
    (n12 * n23 * n31 -
      n13 * n22 * n31 +
      n13 * n21 * n32 -
      n11 * n23 * n32 -
      n12 * n21 * n33 +
      n11 * n22 * n33) *
    detInv;

  return { elements: result };
}

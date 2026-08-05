import type { Intersection, Raycaster } from "../core/Raycaster.ts";
import type { Node } from "../core/Node.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Ray } from "../math/Ray.ts";
import { Sphere } from "../math/Sphere.ts";
import { Vector3 } from "../math/Vector3.ts";

const _inverseMatrix = new Matrix4();
const _rayLocal = new Ray();
const _worldSphere = new Sphere();
const _v0 = new Vector3();
const _v1 = new Vector3();
const _v2 = new Vector3();
const _normal = new Vector3();
const _segmentStart = new Vector3();
const _segmentEnd = new Vector3();
const _pointOnRay = new Vector3();
const _pointOnSegment = new Vector3();
const _worldPoint = new Vector3();

/** Tests one geometry against a ray in CPU space and appends triangle hits. */
export function raycastMeshGeometry(
  object: Node,
  geometry: Geometry | undefined,
  matrixWorld: Matrix4,
  raycaster: Raycaster,
  intersects: Intersection[],
): void {
  if (geometry === undefined) return;
  const position = geometry.getAttribute("position");
  if (position === undefined || position.itemSize < 3) return;

  if (geometry.boundingSphere === undefined) geometry.computeBoundingSphere();
  if (geometry.boundingSphere !== undefined) {
    _worldSphere.copy(geometry.boundingSphere).applyMatrix4(matrixWorld);
    if (!raycaster.ray.intersectsSphere(_worldSphere)) return;
  }

  _rayLocal
    .copy(raycaster.ray)
    .applyMatrix4(_inverseMatrix.copy(matrixWorld).invert());
  if (
    geometry.boundingBox !== undefined &&
    !_rayLocal.intersectsBox(geometry.boundingBox)
  ) {
    return;
  }

  const index = geometry.index;
  if (index !== undefined) {
    for (let i = 0; i + 2 < index.length; i += 3) {
      const a = index[i] as number;
      const b = index[i + 1] as number;
      const c = index[i + 2] as number;
      if (a >= position.count || b >= position.count || c >= position.count)
        continue;
      intersectTriangle(
        object,
        matrixWorld,
        raycaster,
        intersects,
        position,
        a,
        b,
        c,
        i / 3,
      );
    }
  } else {
    for (let i = 0; i + 2 < position.count; i += 3) {
      intersectTriangle(
        object,
        matrixWorld,
        raycaster,
        intersects,
        position,
        i,
        i + 1,
        i + 2,
        i / 3,
      );
    }
  }
}

/** Tests line segments against a ray in CPU space and appends hits. */
export function raycastLineGeometry(
  object: Node,
  geometry: Geometry | undefined,
  matrixWorld: Matrix4,
  scale: Vector3,
  lineType: "line" | "segments" | "loop",
  raycaster: Raycaster,
  intersects: Intersection[],
): void {
  if (geometry === undefined) return;
  const position = geometry.getAttribute("position");
  if (position === undefined || position.itemSize < 3 || position.count < 2) {
    return;
  }

  if (geometry.boundingSphere === undefined) geometry.computeBoundingSphere();
  if (geometry.boundingSphere !== undefined) {
    _worldSphere.copy(geometry.boundingSphere).applyMatrix4(matrixWorld);
    _worldSphere.radius += raycaster.lineThreshold;
    if (!raycaster.ray.intersectsSphere(_worldSphere)) return;
  }

  _rayLocal
    .copy(raycaster.ray)
    .applyMatrix4(_inverseMatrix.copy(matrixWorld).invert());
  const averageScale =
    (Math.abs(scale.x) + Math.abs(scale.y) + Math.abs(scale.z)) / 3;
  const localThreshold = (raycaster.lineThreshold ?? 1) / (averageScale || 1);
  const localThresholdSq = localThreshold * localThreshold;
  const index = geometry.index;
  const count = index === undefined ? position.count : index.length;
  const step = lineType === "segments" ? 2 : 1;

  const getIndex = (vertex: number): number =>
    index === undefined ? vertex : (index[vertex] as number);

  for (let i = 0; i + 1 < count; i += step) {
    const a = getIndex(i);
    const b = getIndex(i + 1);
    if (a >= position.count || b >= position.count) continue;
    _segmentStart.set(position.getX(a), position.getY(a), position.getZ(a));
    _segmentEnd.set(position.getX(b), position.getY(b), position.getZ(b));
    const distanceSq = _rayLocal.distanceSqToSegment(
      _segmentStart,
      _segmentEnd,
      _pointOnRay,
      _pointOnSegment,
    );
    if (distanceSq > localThresholdSq) continue;

    _worldPoint.copy(_pointOnRay).applyMatrix4(matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(_worldPoint);
    if (distance < raycaster.near || distance > raycaster.far) continue;
    intersects.push({
      distance,
      point: _pointOnSegment.clone().applyMatrix4(matrixWorld),
      index: i,
      object,
    });
  }

  if (lineType === "loop" && count >= 2) {
    const a = getIndex(count - 1);
    const b = getIndex(0);
    if (a < position.count && b < position.count) {
      _segmentStart.set(position.getX(a), position.getY(a), position.getZ(a));
      _segmentEnd.set(position.getX(b), position.getY(b), position.getZ(b));
      const distanceSq = _rayLocal.distanceSqToSegment(
        _segmentStart,
        _segmentEnd,
        _pointOnRay,
        _pointOnSegment,
      );
      if (distanceSq <= localThresholdSq) {
        _worldPoint.copy(_pointOnRay).applyMatrix4(matrixWorld);
        const distance = raycaster.ray.origin.distanceTo(_worldPoint);
        if (distance >= raycaster.near && distance <= raycaster.far) {
          intersects.push({
            distance,
            point: _pointOnSegment.clone().applyMatrix4(matrixWorld),
            index: count - 1,
            object,
          });
        }
      }
    }
  }
}

/** Tests point vertices against a ray in CPU space and appends hits. */
export function raycastPointsGeometry(
  object: Node,
  geometry: Geometry | undefined,
  matrixWorld: Matrix4,
  scale: Vector3,
  raycaster: Raycaster,
  intersects: Intersection[],
): void {
  if (geometry === undefined) return;
  const position = geometry.getAttribute("position");
  if (position === undefined || position.itemSize < 3) return;

  if (geometry.boundingSphere === undefined) geometry.computeBoundingSphere();
  if (geometry.boundingSphere !== undefined) {
    _worldSphere.copy(geometry.boundingSphere).applyMatrix4(matrixWorld);
    _worldSphere.radius += raycaster.pointsThreshold;
    if (!raycaster.ray.intersectsSphere(_worldSphere)) return;
  }

  _rayLocal
    .copy(raycaster.ray)
    .applyMatrix4(_inverseMatrix.copy(matrixWorld).invert());
  const averageScale =
    (Math.abs(scale.x) + Math.abs(scale.y) + Math.abs(scale.z)) / 3;
  const localThreshold = (raycaster.pointsThreshold ?? 1) / (averageScale || 1);
  const localThresholdSq = localThreshold * localThreshold;
  const index = geometry.index;
  const count = index === undefined ? position.count : index.length;
  for (let i = 0; i < count; i++) {
    const vertex = index === undefined ? i : (index[i] as number);
    if (vertex >= position.count) continue;
    _segmentStart.set(
      position.getX(vertex),
      position.getY(vertex),
      position.getZ(vertex),
    );
    const distanceSq = _rayLocal.distanceSqToPoint(_segmentStart);
    if (distanceSq > localThresholdSq) continue;

    _pointOnRay.copy(_rayLocal.closestPointToPoint(_segmentStart));
    _worldPoint.copy(_pointOnRay).applyMatrix4(matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(_worldPoint);
    if (distance < raycaster.near || distance > raycaster.far) continue;
    intersects.push({
      distance,
      point: _worldPoint.clone(),
      index: vertex,
      object,
    });
  }
}

function intersectTriangle(
  object: Node,
  matrixWorld: Matrix4,
  raycaster: Raycaster,
  intersects: Intersection[],
  position: {
    count: number;
    getX: (index: number) => number;
    getY: (index: number) => number;
    getZ: (index: number) => number;
  },
  a: number,
  b: number,
  c: number,
  faceIndex: number,
): boolean {
  _v0.set(position.getX(a), position.getY(a), position.getZ(a));
  _v1.set(position.getX(b), position.getY(b), position.getZ(b));
  _v2.set(position.getX(c), position.getY(c), position.getZ(c));
  const point = _rayLocal.intersectTriangle(_v0, _v1, _v2, false, _worldPoint);
  if (point === undefined) return false;

  const distancePoint = point.clone().applyMatrix4(matrixWorld);
  const distance = raycaster.ray.origin.distanceTo(distancePoint);
  if (distance < raycaster.near || distance > raycaster.far) return false;

  _normal.copy(_v1).sub(_v0);
  _v2.sub(_v0);
  _normal.cross(_v2).normalize();
  intersects.push({
    distance,
    point: distancePoint,
    face: { a, b, c, normal: _normal.clone() },
    object,
  });
  const hit = intersects[intersects.length - 1] as Intersection & {
    faceIndex?: number;
  };
  hit.faceIndex = faceIndex;
  return true;
}

declare module "three" {
  type Point2 = { x: number; y: number };
  type Point3 = { x: number; y: number; z: number };
  type Point4 = { x: number; y: number; z: number; w: number };
  type EulerOrder = string;

  export class Vector2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
    copy(v: Point2): this;
    clone(): Vector2;
    add(v: Point2): this;
    sub(v: Point2): this;
    multiplyScalar(s: number): this;
    distanceTo(v: Point2): number;
    length(): number;
  }
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(v: Point3): this;
    clone(): Vector3;
    add(v: Point3): this;
    sub(v: Point3): this;
    multiplyScalar(s: number): this;
    distanceTo(v: Point3): number;
    divideScalar(s: number): this;
    dot(v: Point3): number;
    cross(v: Point3): this;
    crossVectors(a: Point3, b: Point3): this;
    lerp(v: Point3, alpha: number): this;
    length(): number;
    lengthSq(): number;
    applyMatrix4(m: Matrix4): this;
  }
  export class Vector4 {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x?: number, y?: number, z?: number, w?: number);
    set(x: number, y: number, z: number, w: number): this;
    copy(v: Point4): this;
    clone(): Vector4;
  }
  export class Matrix3 {
    elements: number[];
    constructor(...args: unknown[]);
    set(...values: number[]): this;
    identity(): this;
    clone(): Matrix3;
    copy(m: Matrix3): this;
    multiply(m: Matrix3): this;
    premultiply(m: Matrix3): this;
    invert(): this;
    transpose(): this;
    determinant(): number;
  }
  export class Matrix4 {
    elements: number[];
    constructor(...args: unknown[]);
    set(...values: number[]): this;
    identity(): this;
    clone(): Matrix4;
    copy(m: Matrix4): this;
    multiply(m: Matrix4): this;
    premultiply(m: Matrix4): this;
    invert(): this;
    transpose(): this;
    makeTranslation(x: number, y: number, z: number): this;
    makeRotationX(theta: number): this;
    makeRotationY(theta: number): this;
    makeRotationZ(theta: number): this;
    makeScale(x: number, y: number, z: number): this;
    multiplyMatrices(a: Matrix4, b: Matrix4): this;
    makePerspective(...values: number[]): this;
    makeOrthographic(...values: number[]): this;
    compose(position: Point3, quaternion: Quaternion, scale: Point3): this;
    decompose(position: Vector3, quaternion: Quaternion, scale: Vector3): this;
  }
  export class Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x?: number, y?: number, z?: number, w?: number);
    set(x: number, y: number, z: number, w: number): this;
    copy(q: Point4): this;
    clone(): Quaternion;
    setFromEuler(e: Euler): this;
    setFromAxisAngle(axis: Point3, angle: number): this;
    multiply(q: Quaternion): this;
    premultiply(q: Quaternion): this;
    slerp(q: Quaternion, t: number): this;
    setFromRotationMatrix(m: Matrix4): this;
  }
  export class Euler {
    x: number;
    y: number;
    z: number;
    order: EulerOrder;
    constructor(x?: number, y?: number, z?: number, order?: EulerOrder);
    set(x: number, y: number, z: number, order?: EulerOrder): this;
    copy(e: Euler): this;
    clone(): Euler;
    setFromQuaternion(q: Quaternion, order?: EulerOrder): this;
    setFromRotationMatrix(m: Matrix4, order?: EulerOrder): this;
  }
  export class Box2 {
    min: Vector2;
    max: Vector2;
    constructor(min?: Vector2, max?: Vector2);
    set(min: Vector2, max: Vector2): this;
    clone(): Box2;
    copy(box: Box2): this;
    getCenter(target: Vector2): Vector2;
    getSize(target: Vector2): Vector2;
    containsPoint(point: Point2): boolean;
    expandByPoint(point: Point2): this;
    union(box: Box2): this;
    intersect(box: Box2): this;
  }
  export class Box3 {
    min: Vector3;
    max: Vector3;
    constructor(min?: Vector3, max?: Vector3);
    set(min: Vector3, max: Vector3): this;
    clone(): Box3;
    copy(box: Box3): this;
    getCenter(target: Vector3): Vector3;
    getSize(target: Vector3): Vector3;
    containsPoint(point: Point3): boolean;
    expandByPoint(point: Point3): this;
    union(box: Box3): this;
    intersect(box: Box3): this;
  }
  export class Sphere {
    center: Vector3;
    radius: number;
    constructor(center?: Vector3, radius?: number);
    clone(): Sphere;
    copy(sphere: Sphere): this;
    containsPoint(point: Point3): boolean;
    distanceToPoint(point: Point3): number;
  }
  export class Plane {
    normal: Vector3;
    constant: number;
    constructor(normal?: Vector3, constant?: number);
    set(normal: Vector3, constant: number): this;
    clone(): Plane;
    copy(plane: Plane): this;
    distanceToPoint(point: Point3): number;
    projectPoint(point: Point3, target: Vector3): Vector3;
    setFromNormalAndCoplanarPoint(normal: Point3, point: Point3): this;
  }
  export class Ray {
    origin: Vector3;
    direction: Vector3;
    constructor(origin?: Vector3, direction?: Vector3);
    set(origin: Vector3, direction: Vector3): this;
    at(t: number, target: Vector3): Vector3;
    distanceToPoint(point: Point3): number;
    intersectSphere(sphere: Sphere, target: Vector3): Vector3 | undefined;
    intersectPlane(plane: Plane, target: Vector3): Vector3 | undefined;
    intersectBox(box: Box3, target: Vector3): Vector3 | undefined;
    clone(): Ray;
    equals(ray: Ray): boolean;
  }
  export class Line3 {
    start: Vector3;
    end: Vector3;
    constructor(start?: Vector3, end?: Vector3);
    clone(): Line3;
    copy(line: Line3): this;
    getCenter(target: Vector3): Vector3;
    distance(): number;
    delta(target: Vector3): Vector3;
    at(t: number, target: Vector3): Vector3;
    closestPointToPoint(
      point: Point3,
      clampToLine: boolean,
      target: Vector3,
    ): Vector3;
  }
  export class Triangle {
    a: Vector3;
    b: Vector3;
    c: Vector3;
    constructor(a?: Vector3, b?: Vector3, c?: Vector3);
    clone(): Triangle;
    copy(triangle: Triangle): this;
    getArea(): number;
    getMidpoint(target: Vector3): Vector3;
    getNormal(target: Vector3): Vector3;
    closestPointToPoint(point: Point3, target: Vector3): Vector3;
    getBarycoord(point: Point3, target: Vector3): Vector3;
  }
  export class Frustum {
    constructor(...args: unknown[]);
    setFromProjectionMatrix(m: Matrix4): this;
    containsPoint(point: Point3): boolean;
    intersectsSphere(sphere: Sphere): boolean;
    intersectsBox(box: Box3): boolean;
  }
  export class Spherical {
    radius: number;
    phi: number;
    theta: number;
    constructor(radius?: number, phi?: number, theta?: number);
    set(radius: number, phi: number, theta: number): this;
    clone(): Spherical;
    copy(s: Spherical): this;
    setFromVector3(v: Point3): this;
  }
  export class Cylindrical {
    radius: number;
    theta: number;
    y: number;
    constructor(radius?: number, theta?: number, y?: number);
    set(radius: number, theta: number, y: number): this;
    clone(): Cylindrical;
    copy(c: Cylindrical): this;
    setFromVector3(v: Point3): this;
  }

  export class CurvePath<TPoint = Vector2> {
    curves: unknown[];
    constructor(...args: unknown[]);
    add(curve: unknown): void;
    getPoint(t: number): TPoint;
    getPoints(divisions?: number): TPoint[];
    getSpacedPoints(divisions?: number): TPoint[];
    getLength(): number;
  }
  export class Path extends CurvePath<Vector2> {
    constructor(points?: Vector2[]);
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): this;
    bezierCurveTo(
      cp1x: number,
      cp1y: number,
      cp2x: number,
      cp2y: number,
      x: number,
      y: number,
    ): this;
  }
  export class Shape extends Path {
    holes: Path[];
    extractPoints(divisions: number): { shape: Vector2[]; holes: Vector2[][] };
  }
  export class LineCurve {
    constructor(v1: Vector2, v2: Vector2);
    getPoint(t: number): Vector2;
    getPoints(divisions?: number): Vector2[];
    getLength(): number;
  }
  export class QuadraticBezierCurve {
    constructor(v0: Vector2, v1: Vector2, v2: Vector2);
    getPoint(t: number): Vector2;
    getPoints(divisions?: number): Vector2[];
    getLength(): number;
  }
  export class CubicBezierCurve {
    constructor(v0: Vector2, v1: Vector2, v2: Vector2, v3: Vector2);
    getPoint(t: number): Vector2;
    getPoints(divisions?: number): Vector2[];
    getLength(): number;
  }
  export class EllipseCurve {
    constructor(...args: unknown[]);
    getPoint(t: number): Vector2;
    getPoints(divisions?: number): Vector2[];
    getLength(): number;
  }
  export class ArcCurve extends EllipseCurve {}
  export class SplineCurve {
    constructor(points?: Vector2[]);
    getPoint(t: number): Vector2;
    getPoints(divisions?: number): Vector2[];
    getLength(): number;
  }
  export class LineCurve3 {
    constructor(v1: Vector3, v2: Vector3);
    getPoint(t: number): Vector3;
    getPoints(divisions?: number): Vector3[];
    getLength(): number;
  }
  export class QuadraticBezierCurve3 {
    constructor(v0: Vector3, v1: Vector3, v2: Vector3);
    getPoint(t: number): Vector3;
    getPoints(divisions?: number): Vector3[];
    getLength(): number;
  }
  export class CubicBezierCurve3 {
    constructor(v0: Vector3, v1: Vector3, v2: Vector3, v3: Vector3);
    getPoint(t: number): Vector3;
    getPoints(divisions?: number): Vector3[];
    getLength(): number;
  }
  export class CatmullRomCurve3 {
    constructor(
      points?: Vector3[],
      closed?: boolean,
      curveType?: string,
      tension?: number,
    );
    getPoint(t: number): Vector3;
    getPoints(divisions?: number): Vector3[];
    getLength(): number;
  }

  export class BufferAttribute {
    array: ArrayLike<number>;
    itemSize: number;
    count: number;
    constructor(array: ArrayLike<number>, itemSize: number);
  }
  export class Float32BufferAttribute extends BufferAttribute {}
  export class Uint16BufferAttribute extends BufferAttribute {}
  export class Uint32BufferAttribute extends BufferAttribute {}
  export class BufferGeometry {
    attributes: Record<string, BufferAttribute>;
    index: BufferAttribute | null;
    constructor(...args: unknown[]);
    getAttribute(name: string): BufferAttribute;
    getIndex(): BufferAttribute;
    setAttribute(name: string, attribute: BufferAttribute): this;
    setIndex(index: BufferAttribute | number[]): this;
  }
  export class BoxGeometry extends BufferGeometry {}
  export class CapsuleGeometry extends BufferGeometry {}
  export class CircleGeometry extends BufferGeometry {}
  export class ConeGeometry extends BufferGeometry {}
  export class CylinderGeometry extends BufferGeometry {}
  export class DodecahedronGeometry extends BufferGeometry {}
  export class EdgesGeometry extends BufferGeometry {}
  export class ExtrudeGeometry extends BufferGeometry {}
  export class IcosahedronGeometry extends BufferGeometry {}
  export class LatheGeometry extends BufferGeometry {}
  export class OctahedronGeometry extends BufferGeometry {}
  export class PlaneGeometry extends BufferGeometry {}
  export class PolyhedronGeometry extends BufferGeometry {}
  export class RingGeometry extends BufferGeometry {}
  export class ShapeGeometry extends BufferGeometry {}
  export class SphereGeometry extends BufferGeometry {}
  export class TetrahedronGeometry extends BufferGeometry {}
  export class TorusGeometry extends BufferGeometry {}
  export class TorusKnotGeometry extends BufferGeometry {}
  export class TubeGeometry extends BufferGeometry {}
  export class WireframeGeometry extends BufferGeometry {}
}

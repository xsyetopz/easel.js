import { Ray } from "../math/Ray.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Layers } from "./Layers.ts";

const _cameraPosition = new Vector3();

/** Scene-graph surface required for CPU ray traversal. */
export interface RaycastObject {
  /** Whether this object participates in traversal. */
  visible: boolean;
  /** Layer mask used to filter this object. */
  layers: Layers;
  /** Runtime type label used for bounded traversal behavior. */
  type?: string;
  /** Child objects considered by recursive intersection queries. */
  children?: readonly RaycastObject[];
  /** Appends this object's intersections to the supplied result array. */
  raycast?: (raycaster: Raycaster, intersects: Intersection[]) => void;
}

/** World-space intersection returned by a raycast query. */
export interface Intersection {
  /** Distance from the ray origin in world units. */
  distance: number;
  /** World-space point where the ray intersects the object. */
  point: Vector3;
  /** Intersected triangle data, or undefined for lines and points. */
  face?:
    | { a: number; b: number; c: number; normal: Vector3 | undefined }
    | undefined;
  /** Source vertex or segment index when the object provides one. */
  index?: number | undefined;
  /** Object that produced the intersection. */
  object: RaycastObject;
}

/** Camera matrices required to construct a world-space picking ray. */
export interface RaycastCamera {
  /** Runtime camera type used to select perspective or orthographic setup. */
  type: string;
  /** Prepared camera-to-world transform used to unproject coordinates. */
  matrixWorld: { elements: ArrayLike<number> };
  /** Prepared inverse projection used to unproject coordinates. */
  projectionMatrixInverse: { elements: ArrayLike<number> };
  /** Optional orthographic marker retained for structural camera parity. */
  isOrthographic?: boolean;
}

/** Casts a ray into the scene to test intersections with objects. */
export class Raycaster {
  #lineThreshold = 1;
  #pointsThreshold = 1;

  /** Mutable world-space ray used by intersection queries. */
  ray: Ray;

  /** Minimum accepted ray distance in world units. */
  near: number;

  /** Maximum accepted ray distance in world units. */
  far: number;

  /** Camera used by the most recent `setFromCamera` call, if any. */
  camera: RaycastCamera | undefined;

  /** Layer mask applied before object-specific raycasts. */
  layers: Layers;

  /** World-space tolerance used for line intersection tests. */
  get lineThreshold(): number {
    return this.#lineThreshold;
  }

  /** Replaces the world-space line intersection tolerance. */
  set lineThreshold(value: number) {
    this.#lineThreshold = value;
  }

  /** World-space tolerance used for point intersection tests. */
  get pointsThreshold(): number {
    return this.#pointsThreshold;
  }

  /** Replaces the world-space point intersection tolerance. */
  set pointsThreshold(value: number) {
    this.#pointsThreshold = value;
  }

  /** Creates a raycaster with an origin, direction, and distance interval. */
  constructor(
    origin: Vector3 = new Vector3(),
    direction: Vector3 = new Vector3(0, 0, -1),
    near: number = 0,
    far: number = Number.POSITIVE_INFINITY,
  ) {
    this.ray = new Ray(origin, direction);
    this.near = near;
    this.far = far;
    this.camera = undefined;
    this.layers = new Layers();
  }

  /** Replaces the ray origin and direction. */
  set(origin: Vector3, direction: Vector3): this {
    this.ray.set(origin, direction);
    return this;
  }

  /** Builds a world-space ray from normalized device coordinates and camera matrices. */
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
        .sub(_cameraPosition.setFromMatrixPosition(camera.matrixWorld))
        .normalize();
    }
    return this;
  }

  /** Tests one object, optionally traversing children, and sorts hits by distance. */
  intersectObject(
    object: RaycastObject,
    recursive: boolean = true,
    intersects: Intersection[] = [],
  ): Intersection[] {
    _intersectObject(object, this, intersects, recursive);
    intersects.sort(_ascSort);
    return intersects;
  }

  /** Tests each object, optionally traversing children, and sorts hits by distance. */
  intersectObjects(
    objects: readonly RaycastObject[],
    recursive: boolean = true,
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
  object: RaycastObject,
  raycaster: Raycaster,
  intersects: Intersection[],
  recursive: boolean,
): void {
  if (!object.visible) return;
  if (!raycaster.layers.test(object.layers)) return;

  // Renderable objects own their geometry-specific CPU traversal. The
  // raycaster only handles visibility, layers, hierarchy, and ordering.
  object.raycast?.(raycaster, intersects);

  // LOD.raycast selects and delegates to its active level. Its children are
  // implementation details and must not be traversed a second time.
  if (recursive && object.type !== "LOD" && object.children) {
    for (const child of object.children) {
      _intersectObject(child, raycaster, intersects, recursive);
    }
  }
}

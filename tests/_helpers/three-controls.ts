/**
 * Typed access to three.js r186 cameras, scene objects, and example controls
 * for side-by-side parity tests. The shapes below cover only the members the
 * control tests read; `tests/three.d.ts` does not declare these classes.
 */

type Xyz = { x: number; y: number; z: number };

export interface ThreeVector3 extends Xyz {
  set(x: number, y: number, z: number): this;
  copy(v: Xyz): this;
  project(camera: ThreeCamera): this;
}

export interface ThreeQuaternion extends Xyz {
  w: number;
  set(x: number, y: number, z: number, w: number): this;
}

export interface ThreeEventDispatcher {
  addEventListener(
    type: string,
    listener: (event: { type: string; [key: string]: unknown }) => void,
  ): void;
}

export interface ThreeObject3D extends ThreeEventDispatcher {
  name: string;
  position: ThreeVector3;
  quaternion: ThreeQuaternion;
  scale: ThreeVector3;
  up: ThreeVector3;
  matrix: { elements: number[] };
  matrixWorld: { elements: number[] };
  parent: ThreeObject3D | null;
  children: ThreeObject3D[];
  add(...objects: ThreeObject3D[]): this;
  lookAt(x: number, y: number, z: number): void;
  updateMatrixWorld(force?: boolean): void;
}

export interface ThreeCamera extends ThreeObject3D {
  zoom: number;
  updateProjectionMatrix(): void;
}

export interface ThreeCore {
  Vector3: new (x?: number, y?: number, z?: number) => ThreeVector3;
  Object3D: new () => ThreeObject3D;
  Group: new () => ThreeObject3D;
  Scene: new () => ThreeObject3D;
  PerspectiveCamera: new (
    fov?: number,
    aspect?: number,
    near?: number,
    far?: number,
  ) => ThreeCamera;
  OrthographicCamera: new (
    left?: number,
    right?: number,
    top?: number,
    bottom?: number,
    near?: number,
    far?: number,
  ) => ThreeCamera;
  BoxGeometry: new (width?: number, height?: number, depth?: number) => object;
  MeshBasicMaterial: new () => object;
  Mesh: new (geometry: object, material: object) => ThreeObject3D;
}

export interface ThreeControls extends ThreeEventDispatcher {
  object: ThreeObject3D;
  enabled: boolean;
  connect(element: EventTarget): void;
  disconnect(): void;
  dispose(): void;
  update(delta?: number): void;
}

export interface ThreePointerLockControls extends ThreeControls {
  isLocked: boolean;
  minPolarAngle: number;
  maxPolarAngle: number;
  pointerSpeed: number;
  lock(unadjustedMovement?: boolean): void;
  unlock(): void;
  moveForward(distance: number): void;
  moveRight(distance: number): void;
  getDirection(target: ThreeVector3): ThreeVector3;
}

export const THREE = (await import("three")) as unknown as ThreeCore;

/** Loads a three.js r186 example control module by file name. */
export async function loadThreeControl<T>(name: string): Promise<T> {
  const module = (await import(
    `three/examples/jsm/controls/${name}.js`
  )) as Record<string, unknown>;
  return module[name] as T;
}

export interface ThreeDragControls extends ThreeControls {
  objects: ThreeObject3D[];
  recursive: boolean;
  transformGroup: boolean;
  rotateSpeed: number;
  mouseButtons: {
    LEFT: number | null;
    MIDDLE: number | null;
    RIGHT: number | null;
  };
  touches: { ONE: number | null };
}

export interface ThreeTransformControls extends ThreeControls {
  camera: ThreeCamera;
  axis: string | null;
  mode: string;
  space: string;
  size: number;
  dragging: boolean;
  translationSnap: number | null;
  rotationSnap: number | null;
  scaleSnap: number | null;
  showX: boolean;
  showY: boolean;
  showZ: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  rotationAngle: number;
  worldPosition: ThreeVector3;
  eye: ThreeVector3;
  attach(object: ThreeObject3D): this;
  detach(): this;
  reset(): void;
  getHelper(): ThreeObject3D;
}

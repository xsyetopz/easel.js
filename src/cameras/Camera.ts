import { Node, type NodeJSON } from "../core/Node.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import type { Vector3 } from "../math/Vector3.ts";

const _projectionInverse = new Matrix4();

/** Construction options shared by perspective and orthographic cameras. */
export interface CameraOptions {
  /** Near clipping distance in camera space. */
  near?: number;
  /** Far clipping distance in camera space. */
  far?: number;
  /** Rasterizer tile size used when partitioning the Canvas2D framebuffer. */
  tileSize?: number;
}

/** Serialized clipping and rasterizer state shared by EASEL cameras. */
export interface CameraJSON extends NodeJSON {
  /** Serialized near clipping distance in camera space. */
  near: number;
  /** Serialized far clipping distance in camera space. */
  far: number;
  /** Serialized rasterizer tile size. */
  tileSize: number;
}

/** Immutable sub-frustum window used for tiled or multi-view projection. */
export interface CameraView {
  /** Whether the sub-frustum is active for projection. */
  readonly enabled: boolean;
  /** Width of the full view in pixels or view units. */
  readonly fullWidth: number;
  /** Height of the full view in pixels or view units. */
  readonly fullHeight: number;
  /** Horizontal offset of the sub-frustum within the full view. */
  readonly offsetX: number;
  /** Vertical offset of the sub-frustum within the full view. */
  readonly offsetY: number;
  /** Width of the active sub-frustum. */
  readonly width: number;
  /** Height of the active sub-frustum. */
  readonly height: number;
}

/** Validates the bounded single-frustum view-window contract. */
export function assertCameraViewOffset(
  fullWidth: number,
  fullHeight: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
): void {
  if (
    !(
      Number.isFinite(fullWidth) &&
      Number.isFinite(fullHeight) &&
      Number.isFinite(offsetX) &&
      Number.isFinite(offsetY) &&
      Number.isFinite(width) &&
      Number.isFinite(height)
    )
  ) {
    throw new RangeError(
      "Camera.setViewOffset requires finite view dimensions and offsets.",
    );
  }
  if (
    fullWidth <= 0 ||
    fullHeight <= 0 ||
    width <= 0 ||
    height <= 0 ||
    offsetX < 0 ||
    offsetY < 0 ||
    offsetX + width > fullWidth ||
    offsetY + height > fullHeight
  ) {
    throw new RangeError(
      "Camera.setViewOffset requires a positive sub-frustum inside the full view.",
    );
  }
}

/** Builds an immutable camera sub-frustum after dimensions are validated. */
export function makeCameraView(
  fullWidth: number,
  fullHeight: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  enabled: boolean = true,
): CameraView {
  return Object.freeze({
    enabled,
    fullWidth,
    fullHeight,
    offsetX,
    offsetY,
    width,
    height,
  });
}

/**
 * Abstract base for camera nodes. Subclasses provide their projection matrix
 * through {@link updateProjectionMatrix}.
 */
export class Camera extends Node {
  /** Type marker identifying Camera instances. */
  readonly isCamera = true;

  /** Coordinate system hint; the CPU renderer does not use WebGL coordinate systems. */
  coordinateSystem = 0;

  /** Whether depth is reversed; false by default. */
  reversedDepth = false;

  /** Runtime class label used by serialization and camera dispatch. */
  override type: string = "Camera";

  /** Projection from camera space to normalized device coordinates. */
  readonly projectionMatrix: Matrix4 = new Matrix4();
  /** Inverse projection used to construct world-space picking rays. */
  readonly projectionMatrixInverse: Matrix4 = new Matrix4();
  /** Inverse world transform used to move world coordinates into camera space. */
  readonly matrixWorldInverse: Matrix4 = new Matrix4();

  #near: number;
  #far: number;
  #tileSize: number;

  /** Creates a camera with clipping distances and a rasterizer tile size. */
  constructor({ near = 0.1, far = 2000, tileSize = 1 }: CameraOptions = {}) {
    super();
    this.#near = near;
    this.#far = far;
    this.#tileSize = tileSize;
  }

  /** Near clipping distance in camera space. */
  get near(): number {
    return this.#near;
  }

  /** Sets the near clipping distance used by the next projection update. */
  set near(value: number) {
    this.#near = value;
  }

  /** Far clipping distance in camera space. */
  get far(): number {
    return this.#far;
  }

  /** Sets the far clipping distance used by the next projection update. */
  set far(value: number) {
    this.#far = value;
  }

  /** Rasterizer tile size used when partitioning the Canvas2D framebuffer. */
  get tileSize(): number {
    return this.#tileSize;
  }

  /** Sets the rasterizer tile size used by the next render. */
  set tileSize(value: number) {
    this.#tileSize = value;
  }

  /** Rebuilds the projection matrix and its cached inverse. */
  updateProjectionMatrix(): void {
    this.commitProjection();
  }

  /** Updates the world matrix for this camera and optionally its relatives. */
  updateWorldMatrix(updateParents: boolean, updateChildren: boolean): void {
    this.updateMatrixWorld(updateParents, updateChildren);
  }

  /** Commits a prepared projection and its inverse as one mutation. */
  protected commitProjection(
    projection: Matrix4 = this.projectionMatrix,
  ): void {
    _projectionInverse.copy(projection).invert();
    this.projectionMatrix.copy(projection);
    this.projectionMatrixInverse.copy(_projectionInverse);
  }

  /** Rebuilds only the inverse view matrix from the current world matrix. */
  updateMatrixWorldInverse(): this {
    this.matrixWorldInverse.copy(this.matrixWorld).invert();
    return this;
  }

  /** Explicitly updates the world matrix and then rebuilds the inverse view matrix. */
  updateViewMatrix(
    updateParents: boolean = false,
    updateChildren: boolean = true,
    force: boolean = false,
  ): this {
    super.updateMatrixWorld(updateParents, updateChildren, force);
    return this.updateMatrixWorldInverse();
  }

  /** Reads the camera's negative-Z direction from the prepared world matrix. */
  override getWorldDirection(target: Vector3): Vector3 {
    const elements = this.matrixWorld.elements;
    return target.set(-elements[8], -elements[9], -elements[10]).normalize();
  }

  /** Abstract cameras cannot be cloned without a concrete projection type. */
  override clone(): Camera {
    throw new Error(
      "Camera.clone: use OrthographicCamera or PerspectiveCamera",
    );
  }

  /** Copies node transforms, matrices, clipping, and tile settings. */
  override copy(source: Camera, recursive: boolean = true): this {
    super.copy(source, recursive);

    this.projectionMatrix.copy(source.projectionMatrix);
    this.projectionMatrixInverse.copy(source.projectionMatrixInverse);
    this.matrixWorldInverse.copy(source.matrixWorldInverse);
    this.#near = source.near;
    this.#far = source.far;
    this.#tileSize = source.tileSize;
    return this;
  }

  /** Serializes node state and camera clipping configuration. */
  override toJSON(): CameraJSON {
    const json: CameraJSON = {
      ...super.toJSON(),
      near: this.near,
      far: this.far,
      tileSize: this.tileSize,
    };
    if (
      !(
        Number.isFinite(json.near) &&
        Number.isFinite(json.far) &&
        Number.isFinite(json.tileSize)
      )
    ) {
      throw new RangeError("Camera.toJSON requires finite camera values.");
    }
    return json;
  }
}

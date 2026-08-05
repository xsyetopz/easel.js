import { toDegrees, toRadians } from "../math/MathUtils.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Vector2 } from "../math/Vector2.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
  assertCameraViewOffset,
  Camera,
  type CameraJSON,
  type CameraView,
  makeCameraView,
} from "./Camera.ts";

/** Construction options for a perspective camera. */
export interface PerspectiveCameraOptions {
  /** Vertical field of view in degrees. */
  fov?: number;
  /** Viewport width divided by height. */
  aspect?: number;
  /** Near clipping distance in camera space. */
  near?: number;
  /** Far clipping distance in camera space. */
  far?: number;
  /** Rasterizer tile size used when partitioning the Canvas2D framebuffer. */
  tileSize?: number;
  /** Positive perspective zoom multiplier. */
  zoom?: number;
}

/** Serialized perspective frustum, film settings, and optional view window. */
export interface PerspectiveCameraJSON extends CameraJSON {
  /** Vertical field of view in degrees. */
  fov: number;
  /** Viewport width divided by height. */
  aspect: number;
  /** Positive perspective zoom multiplier. */
  zoom: number;
  /** Object distance used by depth-of-field consumers. */
  focus: number;
  /** Film gauge in the same units used by `filmOffset`. */
  filmGauge: number;
  /** Horizontal film offset in the same units as the film gauge. */
  filmOffset: number;
  /** Serialized sub-frustum window, when configured. */
  view?: CameraView;
}

const _v3 = new Vector3();
const _minTarget = new Vector2();
const _maxTarget = new Vector2();
const _projection = new Matrix4();

/**
 * Camera using perspective projection. Canvas2D rasterization intentionally
 * keeps affine UV interpolation while retaining perspective clip-space W.
 */
export class PerspectiveCamera extends Camera {
  /** Runtime class label used by serialization and camera dispatch. */
  override type: string = "PerspectiveCamera";

  #fov: number;
  #aspect: number;
  #zoom: number;
  #view: CameraView | undefined;

  /** Object distance used by external depth-of-field consumers. */
  focus: number = 10;
  /** Film size for the larger image axis, in millimeters by convention. */
  filmGauge: number = 35;
  /** Horizontal film offset in the same units as `filmGauge`. */
  filmOffset: number = 0;

  /** Creates a perspective camera and prepares its initial projection. */
  constructor({
    fov = 45,
    aspect = 1,
    near = 0.1,
    far = 2000,
    tileSize = 1,
    zoom = 1,
  }: PerspectiveCameraOptions = {}) {
    super({ near, far, tileSize });
    this.#fov = fov;
    this.#aspect = aspect;
    this.#zoom = zoom;
    this.#assertZoom(this.#zoom);
    this.updateProjectionMatrix();
  }

  /** Vertical field of view in degrees before zoom is applied. */
  get fov(): number {
    return this.#fov;
  }

  /** Sets the vertical field of view in degrees; update the projection afterward. */
  set fov(value: number) {
    this.#fov = value;
  }

  /** Viewport width divided by height. */
  get aspect(): number {
    return this.#aspect;
  }

  /** Sets the viewport aspect ratio; update the projection afterward. */
  set aspect(value: number) {
    this.#aspect = value;
  }

  /** Positive perspective zoom multiplier. */
  get zoom(): number {
    return this.#zoom;
  }

  /** Stores a positive zoom multiplier; update the projection afterward. */
  set zoom(value: number) {
    this.#assertZoom(value);
    this.#zoom = value;
  }

  /** Active sub-frustum window, or `undefined` when none is configured. */
  get view(): CameraView | undefined {
    return this.#view;
  }

  /** Rebuilds the perspective projection for current lens and view settings. */
  override updateProjectionMatrix(): void {
    const near = this.near;
    const tanHalfFov = Math.tan(toRadians(this.#fov) / 2);
    let top = (near * tanHalfFov) / this.#zoom;
    let height = 2 * top;
    let width = this.#aspect * height;
    let left = -0.5 * width;
    const view = this.#view;

    if (view?.enabled) {
      left += (view.offsetX * width) / view.fullWidth;
      top -= (view.offsetY * height) / view.fullHeight;
      width *= view.width / view.fullWidth;
      height *= view.height / view.fullHeight;
    }

    if (this.filmOffset !== 0) {
      left += (near * this.filmOffset) / this.filmWidth;
    }

    makePerspectiveFrustum(
      _projection,
      left,
      left + width,
      top,
      top - height,
      near,
      this.far,
    );
    this.commitProjection(_projection);
  }

  /** Focal length implied by the vertical field of view and film gauge. */
  get focalLength(): number {
    const verticalExtentSlope = Math.tan(toRadians(this.#fov) * 0.5);
    return (0.5 * this.filmHeight) / verticalExtentSlope;
  }

  /** Sets the vertical field of view in degrees from a positive focal length. */
  set focalLength(focalLength: number) {
    assertPositiveFinite(focalLength, "PerspectiveCamera.focalLength");
    const verticalExtentSlope = (0.5 * this.filmHeight) / focalLength;
    this.#fov = toDegrees(2 * Math.atan(verticalExtentSlope));
    this.updateProjectionMatrix();
  }

  /** Vertical field of view in degrees after applying zoom. */
  get effectiveFOV(): number {
    return toDegrees(
      2 * Math.atan(Math.tan(toRadians(this.#fov) * 0.5) / this.#zoom),
    );
  }

  /** Film width for the current viewport aspect ratio. */
  get filmWidth(): number {
    return this.filmGauge * Math.min(this.#aspect, 1);
  }

  /** Film height for the current viewport aspect ratio. */
  get filmHeight(): number {
    return this.filmGauge / Math.max(this.#aspect, 1);
  }

  /** Computes camera-space view bounds at the supplied distance. */
  viewBoundsAt(distance: number, minTarget: Vector2, maxTarget: Vector2): void {
    _v3.set(-1, -1, 0.5).applyMatrix4(this.projectionMatrixInverse);
    minTarget.set(_v3.x, _v3.y).multiplyScalar(-distance / _v3.z);

    _v3.set(1, 1, 0.5).applyMatrix4(this.projectionMatrixInverse);
    maxTarget.set(_v3.x, _v3.y).multiplyScalar(-distance / _v3.z);
  }

  /** Computes camera-space view size at the supplied distance. */
  viewSizeAt(distance: number, target: Vector2): Vector2 {
    this.viewBoundsAt(distance, _minTarget, _maxTarget);
    return target.subVectors(_maxTarget, _minTarget);
  }

  /** Returns an independent camera with copied lens and view state. */
  override clone(): PerspectiveCamera {
    return new PerspectiveCamera().copy(this);
  }

  /** Copies shared camera state, lens settings, and view window. */
  override copy(source: Camera, recursive: boolean = true): this {
    super.copy(source, recursive);
    if (!(source instanceof PerspectiveCamera)) return this;
    this.#fov = source.fov;
    this.#aspect = source.aspect;
    this.#zoom = source.zoom;
    this.focus = source.focus;
    this.filmGauge = source.filmGauge;
    this.filmOffset = source.filmOffset;
    this.#view = source.view
      ? makeCameraView(
          source.view.fullWidth,
          source.view.fullHeight,
          source.view.offsetX,
          source.view.offsetY,
          source.view.width,
          source.view.height,
          source.view.enabled,
        )
      : undefined;
    this.updateProjectionMatrix();
    return this;
  }

  /** Serializes node state and perspective projection configuration. */
  override toJSON(): PerspectiveCameraJSON {
    const json: PerspectiveCameraJSON = {
      ...super.toJSON(),
      fov: this.#fov,
      aspect: this.#aspect,
      zoom: this.#zoom,
      focus: this.focus,
      filmGauge: this.filmGauge,
      filmOffset: this.filmOffset,
    };
    if (this.#view) json.view = this.#view;
    assertFinitePerspectiveJSON(json);
    return json;
  }

  /** Configures a validated sub-frustum, updates aspect, and rebuilds projection. */
  setViewOffset(
    fullWidth: number,
    fullHeight: number,
    offsetX: number,
    offsetY: number,
    width: number,
    height: number,
  ): this {
    assertCameraViewOffset(
      fullWidth,
      fullHeight,
      offsetX,
      offsetY,
      width,
      height,
    );
    this.#aspect = fullWidth / fullHeight;
    this.#view = makeCameraView(
      fullWidth,
      fullHeight,
      offsetX,
      offsetY,
      width,
      height,
    );
    this.updateProjectionMatrix();
    return this;
  }

  /** Disables the configured sub-frustum while preserving its dimensions. */
  clearViewOffset(): this {
    if (this.#view?.enabled) {
      this.#view = makeCameraView(
        this.#view.fullWidth,
        this.#view.fullHeight,
        this.#view.offsetX,
        this.#view.offsetY,
        this.#view.width,
        this.#view.height,
        false,
      );
    }
    this.updateProjectionMatrix();
    return this;
  }

  #assertZoom(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        "PerspectiveCamera.zoom must be finite and positive.",
      );
    }
  }
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be finite and positive.`);
  }
}

function assertFinitePerspectiveJSON(json: PerspectiveCameraJSON): void {
  const values = [
    json.fov,
    json.aspect,
    json.zoom,
    json.focus,
    json.filmGauge,
    json.filmOffset,
  ];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new RangeError(
      "PerspectiveCamera.toJSON requires finite projection values.",
    );
  }
}

function makePerspectiveFrustum(
  matrix: Matrix4,
  left: number,
  right: number,
  top: number,
  bottom: number,
  near: number,
  far: number,
): Matrix4 {
  const te = matrix.elements;
  const x = (2 * near) / (right - left);
  const y = (2 * near) / (top - bottom);
  const a = (right + left) / (right - left);
  const b = (top + bottom) / (top - bottom);
  const c = -(far + near) / (far - near);
  const d = (-2 * far * near) / (far - near);

  te[0] = x;
  te[4] = 0;
  te[8] = a;
  te[12] = 0;
  te[1] = 0;
  te[5] = y;
  te[9] = b;
  te[13] = 0;
  te[2] = 0;
  te[6] = 0;
  te[10] = c;
  te[14] = d;
  te[3] = 0;
  te[7] = 0;
  te[11] = -1;
  te[15] = 0;
  return matrix;
}

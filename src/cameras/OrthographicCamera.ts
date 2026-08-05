import {
  assertCameraViewOffset,
  Camera,
  type CameraJSON,
  type CameraView,
  makeCameraView,
} from "./Camera.ts";
import { Matrix4 } from "../math/Matrix4.ts";

const _projection = new Matrix4();

/** Construction options for an orthographic camera. */
export interface OrthographicCameraOptions {
  /** Left edge of the orthographic frustum in camera space. */
  left?: number;
  /** Right edge of the orthographic frustum in camera space. */
  right?: number;
  /** Top edge of the orthographic frustum in camera space. */
  top?: number;
  /** Bottom edge of the orthographic frustum in camera space. */
  bottom?: number;
  /** Near clipping distance in camera space. */
  near?: number;
  /** Far clipping distance in camera space. */
  far?: number;
  /** Rasterizer tile size used when partitioning the Canvas2D framebuffer. */
  tileSize?: number;
  /** Positive orthographic zoom multiplier. */
  zoom?: number;
}

/** Serialized orthographic frustum, zoom, and optional view window. */
export interface OrthographicCameraJSON extends CameraJSON {
  /** Serialized left frustum edge in camera space. */
  left: number;
  /** Serialized right frustum edge in camera space. */
  right: number;
  /** Serialized top frustum edge in camera space. */
  top: number;
  /** Serialized bottom frustum edge in camera space. */
  bottom: number;
  /** Serialized positive orthographic zoom multiplier. */
  zoom: number;
  /** Serialized sub-frustum window, when configured. */
  view?: CameraView;
}

/** Camera using a parallel orthographic projection. */
export class OrthographicCamera extends Camera {
  /** Runtime class label used by serialization and camera dispatch. */
  override type: string = "OrthographicCamera";

  #left: number;
  #right: number;
  #top: number;
  #bottom: number;
  #zoom: number;
  #view: CameraView | undefined;

  /** Creates an orthographic camera and prepares its initial projection. */
  constructor({
    left = -1,
    right = 1,
    top = 1,
    bottom = -1,
    near = 0.1,
    far = 2000,
    tileSize = 1,
    zoom = 1,
  }: OrthographicCameraOptions = {}) {
    super({ near, far, tileSize });
    this.#left = left;
    this.#right = right;
    this.#top = top;
    this.#bottom = bottom;
    this.#zoom = zoom;
    this.#assertZoom(this.#zoom);
    this.updateProjectionMatrix();
  }

  /** Left edge of the orthographic frustum in camera space. */
  get left(): number {
    return this.#left;
  }

  /** Sets the left frustum edge; call `updateProjectionMatrix()` to commit it. */
  set left(value: number) {
    this.#left = value;
  }

  /** Right edge of the orthographic frustum in camera space. */
  get right(): number {
    return this.#right;
  }

  /** Sets the right frustum edge; call `updateProjectionMatrix()` to commit it. */
  set right(value: number) {
    this.#right = value;
  }

  /** Top edge of the orthographic frustum in camera space. */
  get top(): number {
    return this.#top;
  }

  /** Sets the top frustum edge; call `updateProjectionMatrix()` to commit it. */
  set top(value: number) {
    this.#top = value;
  }

  /** Bottom edge of the orthographic frustum in camera space. */
  get bottom(): number {
    return this.#bottom;
  }

  /** Sets the bottom frustum edge; call `updateProjectionMatrix()` to commit it. */
  set bottom(value: number) {
    this.#bottom = value;
  }

  /** Positive orthographic zoom multiplier. */
  get zoom(): number {
    return this.#zoom;
  }

  /** Stores a positive zoom multiplier; call `updateProjectionMatrix()` to commit it. */
  set zoom(value: number) {
    this.#assertZoom(value);
    this.#zoom = value;
  }

  /** Active sub-frustum window, or `undefined` when none is configured. */
  get view(): CameraView | undefined {
    return this.#view;
  }

  /** Rebuilds the orthographic projection for current frustum, zoom, and view. */
  override updateProjectionMatrix(): void {
    const dx = (this.#right - this.#left) / (2 * this.#zoom);
    const dy = (this.#top - this.#bottom) / (2 * this.#zoom);
    const cx = (this.#right + this.#left) / 2;
    const cy = (this.#top + this.#bottom) / 2;

    let left = cx - dx;
    let right = cx + dx;
    let top = cy + dy;
    let bottom = cy - dy;
    const view = this.#view;

    if (view?.enabled) {
      const scaleW = (this.#right - this.#left) / view.fullWidth / this.#zoom;
      const scaleH = (this.#top - this.#bottom) / view.fullHeight / this.#zoom;
      left += scaleW * view.offsetX;
      right = left + scaleW * view.width;
      top -= scaleH * view.offsetY;
      bottom = top - scaleH * view.height;
    }

    _projection.makeOrthographic(left, right, top, bottom, this.near, this.far);
    this.commitProjection(_projection);
  }

  /** Returns an independent camera with copied frustum, zoom, and view state. */
  override clone(): OrthographicCamera {
    return new OrthographicCamera().copy(this);
  }

  /** Copies shared camera state and orthographic projection parameters. */
  override copy(source: Camera, recursive: boolean = true): this {
    super.copy(source, recursive);
    if (!(source instanceof OrthographicCamera)) return this;
    this.#left = source.left;
    this.#right = source.right;
    this.#top = source.top;
    this.#bottom = source.bottom;
    this.#zoom = source.zoom;
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

  /** Serializes node state and orthographic projection configuration. */
  override toJSON(): OrthographicCameraJSON {
    const json: OrthographicCameraJSON = {
      ...super.toJSON(),
      left: this.#left,
      right: this.#right,
      top: this.#top,
      bottom: this.#bottom,
      zoom: this.#zoom,
    };
    if (this.#view) json.view = this.#view;
    assertFiniteOrthographicJSON(json);
    return json;
  }

  /** Configures a validated sub-frustum and rebuilds the projection. */
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
        "OrthographicCamera.zoom must be finite and positive.",
      );
    }
  }
}

function assertFiniteOrthographicJSON(json: OrthographicCameraJSON): void {
  const values = [json.left, json.right, json.top, json.bottom, json.zoom];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new RangeError(
      "OrthographicCamera.toJSON requires finite projection values.",
    );
  }
}

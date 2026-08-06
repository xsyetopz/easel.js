import { PerspectiveCamera } from "./PerspectiveCamera.ts";

/** Construction options for an array camera. */
export interface ArrayCameraOptions {
  /** Sub cameras rendered into predefined viewport regions. */
  arrayCameras?: PerspectiveCamera[];
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

/**
 * Camera that efficiently renders a scene with a predefined set of sub cameras.
 * Each sub camera renders into its own viewport region, an important
 * performance aspect for rendering VR-style multi-view scenes.
 */
export class ArrayCamera extends PerspectiveCamera {
  /** Runtime class label used by serialization and camera dispatch. */
  override type: string = "ArrayCamera";

  /** Whether this object is an array camera. */
  readonly isArrayCamera: boolean = true;

  /** Whether this camera is used with multiview rendering. */
  readonly isMultiViewCamera: boolean = false;

  /** Array of perspective sub cameras, each with its own viewport. */
  arrayCameras: PerspectiveCamera[];

  /** Creates an array camera with an optional set of sub cameras. */
  constructor({
    arrayCameras = [],
    fov,
    aspect,
    near,
    far,
    tileSize,
    zoom,
  }: ArrayCameraOptions = {}) {
    const options: import("./PerspectiveCamera.ts").PerspectiveCameraOptions =
      {};
    if (fov !== undefined) options.fov = fov;
    if (aspect !== undefined) options.aspect = aspect;
    if (near !== undefined) options.near = near;
    if (far !== undefined) options.far = far;
    if (tileSize !== undefined) options.tileSize = tileSize;
    if (zoom !== undefined) options.zoom = zoom;
    super(options);
    this.arrayCameras = arrayCameras;
  }

  /** Returns an independent array camera with copied sub cameras. */
  override clone(): ArrayCamera {
    return new ArrayCamera().copy(this);
  }

  /** Copies shared perspective state and the sub-camera array. */
  override copy(source: PerspectiveCamera, recursive: boolean = true): this {
    super.copy(source, recursive);
    if (source instanceof ArrayCamera) {
      this.arrayCameras = source.arrayCameras.map((camera) => camera.clone());
    }
    return this;
  }
}

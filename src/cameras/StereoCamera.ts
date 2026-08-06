import { DEG2RAD } from "../math/MathUtils.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { PerspectiveCamera } from "./PerspectiveCamera.ts";

const _eyeRight = new Matrix4();
const _eyeLeft = new Matrix4();
const _projectionMatrix = new Matrix4();

/** Cached lens and separation values used to detect stale stereo projections. */
interface StereoCameraCache {
  focus: number | undefined;
  fov: number | undefined;
  aspect: number | undefined;
  near: number | undefined;
  far: number | undefined;
  zoom: number | undefined;
  eyeSep: number | undefined;
}

/**
 * Stereo camera that uses two perspective cameras with stereoscopic projection.
 * Can be used for rendering stereo effects like 3D Anaglyph or Parallax Barrier.
 */
export class StereoCamera {
  /** Runtime class label used for type detection. */
  type: string = "StereoCamera";

  /** Aspect ratio multiplier applied to the source camera's aspect. */
  aspect: number = 1;

  /** Distance between the left and right eye cameras. */
  eyeSep: number = 0.064;

  /** Left-eye perspective camera; rendered on layer 1. */
  cameraL: PerspectiveCamera;
  /** Right-eye perspective camera; rendered on layer 2. */
  cameraR: PerspectiveCamera;

  #cache: StereoCameraCache = {
    focus: undefined,
    fov: undefined,
    aspect: undefined,
    near: undefined,
    far: undefined,
    zoom: undefined,
    eyeSep: undefined,
  };

  /** Creates a stereo camera with default left and right eye cameras. */
  constructor() {
    this.cameraL = new PerspectiveCamera();
    this.cameraL.layers.enable(1);
    this.cameraL.matrixAutoUpdate = false;

    this.cameraR = new PerspectiveCamera();
    this.cameraR.layers.enable(2);
    this.cameraR.matrixAutoUpdate = false;
  }

  /** Updates the stereo eye cameras based on the given perspective camera. */
  update(camera: PerspectiveCamera): void {
    const cache = this.#cache;

    const needsUpdate =
      cache.focus !== camera.focus ||
      cache.fov !== camera.fov ||
      cache.aspect !== camera.aspect * this.aspect ||
      cache.near !== camera.near ||
      cache.far !== camera.far ||
      cache.zoom !== camera.zoom ||
      cache.eyeSep !== this.eyeSep;

    if (needsUpdate) {
      cache.focus = camera.focus;
      cache.fov = camera.fov;
      cache.aspect = camera.aspect * this.aspect;
      cache.near = camera.near;
      cache.far = camera.far;
      cache.zoom = camera.zoom;
      cache.eyeSep = this.eyeSep;

      // Off-axis stereoscopic effect based on
      // http://paulbourke.net/stereographics/stereorender/

      _projectionMatrix.copy(camera.projectionMatrix);
      const eyeSepHalf = cache.eyeSep / 2;
      const eyeSepOnProjection = (eyeSepHalf * cache.near) / cache.focus;
      const ymax =
        (cache.near * Math.tan(DEG2RAD * cache.fov * 0.5)) / cache.zoom;
      let xmin: number;
      let xmax: number;

      // translate xOffset

      _eyeLeft.elements[12] = -eyeSepHalf;
      _eyeRight.elements[12] = eyeSepHalf;

      // for left eye

      xmin = -ymax * cache.aspect + eyeSepOnProjection;
      xmax = ymax * cache.aspect + eyeSepOnProjection;

      _projectionMatrix.elements[0] = (2 * cache.near) / (xmax - xmin);
      _projectionMatrix.elements[8] = (xmax + xmin) / (xmax - xmin);

      this.cameraL.projectionMatrix.copy(_projectionMatrix);

      // for right eye

      xmin = -ymax * cache.aspect - eyeSepOnProjection;
      xmax = ymax * cache.aspect - eyeSepOnProjection;

      _projectionMatrix.elements[0] = (2 * cache.near) / (xmax - xmin);
      _projectionMatrix.elements[8] = (xmax + xmin) / (xmax - xmin);

      this.cameraR.projectionMatrix.copy(_projectionMatrix);
    }

    this.cameraL.matrix.copy(camera.matrixWorld).multiply(_eyeLeft);
    this.cameraL.matrixWorldNeedsUpdate = true;

    this.cameraR.matrix.copy(camera.matrixWorld).multiply(_eyeRight);
    this.cameraR.matrixWorldNeedsUpdate = true;
  }
}

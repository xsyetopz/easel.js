import { Camera } from "../cameras/Camera.ts";
import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import type { Color, ColorValue } from "../math/Color.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { LineSegments } from "../objects/LineSegments.ts";

import {
  assertCameraHelperMatrix,
  CameraHelperData,
  createCameraHelperColorData,
  createDefaultCameraHelperColors,
  writeCameraHelperColorData,
  writeCameraHelperPoint,
  writeCameraHelperSegments,
} from "./CameraHelperData.ts";

/** Mutable colors for camera-frustum line categories. */
export interface CameraHelperColors {
  /** Color assigned to frustum edges. */
  readonly frustum: Color;
  /** Color assigned to camera cone edges. */
  readonly cone: Color;
  /** Color assigned to the camera up-vector marker. */
  readonly up: Color;
  /** Color assigned to the camera target marker. */
  readonly target: Color;
  /** Color assigned to camera crosshair markers. */
  readonly cross: Color;
}

/** Color values accepted by CameraHelper.colors. */
export interface CameraHelperColorValues {
  /** Color assigned to frustum edges. */
  readonly frustum: ColorValue;
  /** Color assigned to camera cone edges. */
  readonly cone: ColorValue;
  /** Color assigned to the camera up-vector marker. */
  readonly up: ColorValue;
  /** Color assigned to the camera target marker. */
  readonly target: ColorValue;
  /** Color assigned to camera crosshair markers. */
  readonly cross: ColorValue;
}

/** Visualizes a prepared camera frustum with reusable CPU line storage. */
export class CameraHelper extends LineSegments {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "CameraHelper";

  /** Returns `true` for this concrete type. */
  get isCameraHelper(): true {
    return true;
  }

  #camera: Camera;
  readonly #colors: CameraHelperColors;
  readonly #inverseProjection = new Matrix4();
  readonly #worldProjection = new Matrix4();
  readonly #points = new Float64Array(
    (CameraHelperData.Point.camera + 1) * CameraHelperData.Components,
  );

  /** Constructs reusable line geometry for a camera frustum. */
  constructor(camera: Camera) {
    if (!(camera instanceof Camera)) {
      throw new TypeError("CameraHelper camera must be a Camera.");
    }

    const colors = createDefaultCameraHelperColors();
    const geometry = new Geometry();
    geometry.setAttribute(
      "position",
      new Attribute(
        new Float32Array(
          CameraHelperData.SegmentPoints.length * CameraHelperData.Components,
        ),
        CameraHelperData.Components,
      ),
    );
    geometry.setAttribute(
      "color",
      new Attribute(
        createCameraHelperColorData(colors),
        CameraHelperData.Components,
      ),
    );
    super(geometry, new LineMaterial());
    this.#camera = camera;
    this.#colors = colors;
  }

  /** Camera whose prepared projection and view matrices define the frustum. */
  get camera(): Camera {
    return this.#camera;
  }

  /** Replaces the source camera; update() reads its prepared matrices. */
  set camera(value: Camera) {
    if (!(value instanceof Camera)) {
      throw new TypeError("CameraHelper camera must be a Camera.");
    }
    this.#camera = value;
  }

  /** Mutable colors used by helper line vertices. */
  get colors(): CameraHelperColors {
    return this.#colors;
  }

  /** Replaces helper colors; call updateColors() to publish them to geometry. */
  set colors(value: CameraHelperColorValues) {
    this.#colors.frustum.set(value.frustum);
    this.#colors.cone.set(value.cone);
    this.#colors.up.set(value.up);
    this.#colors.target.set(value.target);
    this.#colors.cross.set(value.cross);
  }

  /** Explicitly publishes assigned colors into the reusable vertex buffer. */
  updateColors(): this {
    const attribute = this.geometry?.getAttribute("color");
    if (!(attribute?.array instanceof Float32Array)) {
      throw new Error("CameraHelper color storage is unavailable.");
    }
    writeCameraHelperColorData(attribute.array, this.#colors);
    attribute.needsUpdate = true;
    return this;
  }

  /**
   * Explicitly rebuilds the frustum from already-prepared camera matrices.
   * Camera projection, world, and inverse matrices are never updated
   * implicitly; a private reusable inverse scratch matrix is used instead.
   */
  update(): this {
    const projection = this.#camera.projectionMatrix;
    const world = this.#camera.matrixWorld;
    assertCameraHelperMatrix(projection, "projection");
    assertCameraHelperMatrix(world, "world");
    const determinant = projection.determinant();
    if (
      !Number.isFinite(determinant) ||
      Math.abs(determinant) <= Number.EPSILON
    ) {
      throw new Error(
        "CameraHelper.update requires an invertible prepared projection matrix.",
      );
    }

    this.#inverseProjection.copy(projection).invert();
    this.#worldProjection.multiplyMatrices(world, this.#inverseProjection);
    assertCameraHelperMatrix(this.#worldProjection, "camera transform");
    for (let index = 0; index < CameraHelperData.ClipPoints.length; index++) {
      const point = CameraHelperData.ClipPoints[index];
      if (!point) {
        throw new Error("CameraHelper point table is incomplete.");
      }
      writeCameraHelperPoint(
        this.#worldProjection,
        point,
        this.#points,
        index * CameraHelperData.Components,
      );
    }
    const worldElements = world.elements;
    const cameraOffset =
      CameraHelperData.Point.camera * CameraHelperData.Components;
    this.#points[cameraOffset] = worldElements[12];
    this.#points[cameraOffset + 1] = worldElements[13];
    this.#points[cameraOffset + 2] = worldElements[14];

    const attribute = this.geometry?.getAttribute("position");
    if (!(attribute?.array instanceof Float32Array)) {
      throw new Error("CameraHelper position storage is unavailable.");
    }
    writeCameraHelperSegments(attribute.array, this.#points);
    attribute.needsUpdate = true;
    return this;
  }

  /** Returns an independent helper sharing only the source camera reference. */
  override clone(): CameraHelper {
    return new CameraHelper(this.camera).copy(this);
  }

  /** Copies transform, camera reference, geometry, material, and color state. */
  override copy(source: CameraHelper): this {
    super.copy(source, false);
    this.#camera = source.camera;
    this.geometry = source.geometry?.clone();
    this.material = source.material?.clone();
    this.#colors.frustum.copy(source.colors.frustum);
    this.#colors.cone.copy(source.colors.cone);
    this.#colors.up.copy(source.colors.up);
    this.#colors.target.copy(source.colors.target);
    this.#colors.cross.copy(source.colors.cross);
    return this;
  }

  /** Releases owned geometry, materials, and CPU buffers. */
  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
  }
}

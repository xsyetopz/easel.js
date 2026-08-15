import { Color } from "../math/Color.ts";
import type { Matrix4 } from "../math/Matrix4.ts";

const point = {
  center: 0,
  target: 1,
  near1: 2,
  near2: 3,
  near3: 4,
  near4: 5,
  far1: 6,
  far2: 7,
  far3: 8,
  far4: 9,
  up1: 10,
  up2: 11,
  up3: 12,
  nearCross1: 13,
  nearCross2: 14,
  nearCross3: 15,
  nearCross4: 16,
  farCross1: 17,
  farCross2: 18,
  farCross3: 19,
  farCross4: 20,
  camera: 21,
} as const;

const clipPoints = [
  [0, 0, -1],
  [0, 0, 1],
  [-1, -1, -1],
  [1, -1, -1],
  [-1, 1, -1],
  [1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [-1, 1, 1],
  [1, 1, 1],
  [0.7, 1.1, -1],
  [-0.7, 1.1, -1],
  [0, 2, -1],
  [-1, 0, -1],
  [1, 0, -1],
  [0, -1, -1],
  [0, 1, -1],
  [-1, 0, 1],
  [1, 0, 1],
  [0, -1, 1],
  [0, 1, 1],
] as const;

const segmentPoints = Uint8Array.of(
  point.near1,
  point.near2,
  point.near2,
  point.near4,
  point.near4,
  point.near3,
  point.near3,
  point.near1,
  point.far1,
  point.far2,
  point.far2,
  point.far4,
  point.far4,
  point.far3,
  point.far3,
  point.far1,
  point.near1,
  point.far1,
  point.near2,
  point.far2,
  point.near3,
  point.far3,
  point.near4,
  point.far4,
  point.camera,
  point.near1,
  point.camera,
  point.near2,
  point.camera,
  point.near3,
  point.camera,
  point.near4,
  point.up1,
  point.up2,
  point.up2,
  point.up3,
  point.up3,
  point.up1,
  point.center,
  point.target,
  point.camera,
  point.center,
  point.nearCross1,
  point.nearCross2,
  point.nearCross3,
  point.nearCross4,
  point.farCross1,
  point.farCross2,
  point.farCross3,
  point.farCross4,
);

/** Canonical line topology and storage dimensions for CameraHelper. */
export const CameraHelperData = {
  Point: point,
  ClipPoints: clipPoints,
  SegmentPoints: segmentPoints,
  FrustumSegments: 12,
  ConeSegments: 4,
  UpSegments: 3,
  TargetSegments: 1,
  CrossSegments: 5,
  Components: 3,
} as const;

/** Mutable color storage shared by camera-helper geometry. */
export interface CameraHelperColorState {
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

/** Creates the default color set used by CameraHelper. */
export function createDefaultCameraHelperColors(): CameraHelperColorState {
  return {
    frustum: new Color(0xffaa00),
    cone: new Color(0xff0000),
    up: new Color(0x00aaff),
    target: new Color(0xffffff),
    cross: new Color(0x333333),
  };
}

/** Creates a writable helper color record from supplied values. */
export function createCameraHelperColorData(
  colors: CameraHelperColorState,
): Float32Array {
  const data = new Float32Array(
    CameraHelperData.SegmentPoints.length * CameraHelperData.Components,
  );
  writeCameraHelperColorData(data, colors);
  return data;
}

/** Writes helper colors into an interleaved line-color buffer. */
export function writeCameraHelperColorData(
  data: Float32Array,
  colors: CameraHelperColorState,
): void {
  writeColorRange(data, 0, CameraHelperData.FrustumSegments, colors.frustum);
  writeColorRange(
    data,
    CameraHelperData.FrustumSegments,
    CameraHelperData.ConeSegments,
    colors.cone,
  );
  writeColorRange(
    data,
    CameraHelperData.FrustumSegments + CameraHelperData.ConeSegments,
    CameraHelperData.UpSegments,
    colors.up,
  );
  writeColorRange(
    data,
    CameraHelperData.FrustumSegments +
      CameraHelperData.ConeSegments +
      CameraHelperData.UpSegments,
    CameraHelperData.TargetSegments,
    colors.target,
  );
  writeColorRange(
    data,
    CameraHelperData.FrustumSegments +
      CameraHelperData.ConeSegments +
      CameraHelperData.UpSegments +
      CameraHelperData.TargetSegments,
    CameraHelperData.CrossSegments,
    colors.cross,
  );
}

function writeColorRange(
  data: Float32Array,
  firstSegment: number,
  segmentCount: number,
  color: Color,
): void {
  for (
    let segment = firstSegment;
    segment < firstSegment + segmentCount;
    segment++
  ) {
    const offset = segment * CameraHelperData.Components * 2;
    data[offset] = color.r;
    data[offset + 1] = color.g;
    data[offset + 2] = color.b;
    data[offset + 3] = color.r;
    data[offset + 4] = color.g;
    data[offset + 5] = color.b;
  }
}

/** Validates that a camera-helper matrix contains finite values. */
export function assertCameraHelperMatrix(matrix: Matrix4, label: string): void {
  const elements = matrix.elements;
  for (const element of elements) {
    if (!Number.isFinite(element)) {
      throw new Error(
        `CameraHelper.update requires a finite prepared ${label} matrix.`,
      );
    }
  }
}

/** Writes one frustum point into the reusable position buffer. */
export function writeCameraHelperPoint(
  matrix: Matrix4,
  clipPoint: readonly [number, number, number],
  target: Float64Array,
  offset: number,
): void {
  const x = clipPoint[0];
  const y = clipPoint[1];
  const z = clipPoint[2];
  const elements = matrix.elements;
  const clipW =
    elements[3] * x + elements[7] * y + elements[11] * z + elements[15];
  if (!Number.isFinite(clipW) || Math.abs(clipW) <= Number.EPSILON) {
    throw new Error(
      "CameraHelper.update produced an invalid homogeneous camera point.",
    );
  }
  const inverseW = 1 / clipW;
  const worldX =
    (elements[0] * x + elements[4] * y + elements[8] * z + elements[12]) *
    inverseW;
  const worldY =
    (elements[1] * x + elements[5] * y + elements[9] * z + elements[13]) *
    inverseW;
  const worldZ =
    (elements[2] * x + elements[6] * y + elements[10] * z + elements[14]) *
    inverseW;
  if (
    !(
      Number.isFinite(worldX) &&
      Number.isFinite(worldY) &&
      Number.isFinite(worldZ)
    )
  ) {
    throw new Error("CameraHelper.update produced a non-finite world point.");
  }
  target[offset] = worldX;
  target[offset + 1] = worldY;
  target[offset + 2] = worldZ;
}

/** Writes camera-helper line segments from prepared frustum points. */
export function writeCameraHelperSegments(
  data: Float32Array,
  points: Float64Array,
): void {
  for (
    let segment = 0;
    segment < CameraHelperData.SegmentPoints.length / 2;
    segment++
  ) {
    const point0 = CameraHelperData.SegmentPoints[segment * 2];
    const point1 = CameraHelperData.SegmentPoints[segment * 2 + 1];
    const source0 = point0 * CameraHelperData.Components;
    const source1 = point1 * CameraHelperData.Components;
    const destination = segment * CameraHelperData.Components * 2;
    data[destination] = points[source0];
    data[destination + 1] = points[source0 + 1];
    data[destination + 2] = points[source0 + 2];
    data[destination + 3] = points[source1];
    data[destination + 4] = points[source1 + 1];
    data[destination + 5] = points[source1 + 2];
  }
}

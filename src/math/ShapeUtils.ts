import { earcut } from "./Earcut.ts";

/** Immutable 2D point used by contour and triangulation helpers. */
export interface ShapePoint2D {
  /** Horizontal Cartesian x component. */
  readonly x: number;
  /** Vertical Cartesian y component. */
  readonly y: number;
}

function pointsEqual(a: ShapePoint2D, b: ShapePoint2D): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Returns the signed area of a 2D contour; clockwise contours are negative. */
export function shapeArea(contour: readonly ShapePoint2D[]): number {
  let result = 0;
  for (
    let previous = contour.length - 1, current = 0;
    current < contour.length;
    previous = current++
  ) {
    result +=
      contour[previous].x * contour[current].y -
      contour[current].x * contour[previous].y;
  }
  return result * 0.5;
}

/** Returns true when the signed contour area indicates clockwise winding. */
export function isShapeClockwise(points: readonly ShapePoint2D[]): boolean {
  return shapeArea(points) < 0;
}

/** Triangulates an outer contour and its holes into source-indexed faces. */
export function triangulateShape(
  contour: readonly ShapePoint2D[],
  holes: readonly (readonly ShapePoint2D[])[],
): [number, number, number][] {
  const coordinates: number[] = [];
  const holeIndices: number[] = [];
  const sourceIndices: number[] = [];
  let sourceOffset = 0;

  for (let contourIndex = 0; contourIndex <= holes.length; contourIndex++) {
    const points = contourIndex === 0 ? contour : holes[contourIndex - 1];
    if (contourIndex > 0) holeIndices.push(coordinates.length / 2);
    const lastPoint = points[points.length - 1];
    const length =
      points.length > 2 &&
      lastPoint !== undefined &&
      pointsEqual(lastPoint, points[0])
        ? points.length - 1
        : points.length;
    for (let index = 0; index < length; index++) {
      coordinates.push(points[index].x, points[index].y);
      sourceIndices.push(sourceOffset + index);
    }
    sourceOffset += points.length;
  }

  const indices = earcut(
    coordinates,
    holeIndices.length === 0 ? undefined : holeIndices,
    2,
  );
  const faces: [number, number, number][] = [];
  for (let index = 0; index < indices.length; index += 3) {
    faces.push([
      sourceIndices[indices[index]],
      sourceIndices[indices[index + 1]],
      sourceIndices[indices[index + 2]],
    ]);
  }
  return faces;
}

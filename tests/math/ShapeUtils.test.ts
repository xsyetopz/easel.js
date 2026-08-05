import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import {
  isShapeClockwise,
  shapeArea,
  triangulateShape,
} from "@/math/ShapeUtils.js";
import { Vector2 } from "@/math/Vector2.js";

interface ShapeUtilsLike {
  area(contour: THREE.Vector2[]): number;
  isClockWise(points: THREE.Vector2[]): boolean;
  triangulateShape(
    contour: THREE.Vector2[],
    holes: THREE.Vector2[][],
  ): [number, number, number][];
}

const THREEShapeUtils = (THREE as unknown as { ShapeUtils: ShapeUtilsLike })
  .ShapeUtils;

describe("ShapeUtils", () => {
  it("matches THREE.js signed area and winding", () => {
    const EASEL = [new Vector2(0, 0), new Vector2(4, 0), new Vector2(0, 3)];
		const THREEPoints = EASEL.map(
			(point) => new THREE.Vector2(point.x, point.y),
		);
		expect(shapeArea(EASEL)).toBe(THREEShapeUtils.area(THREEPoints));
		expect(isShapeClockwise(EASEL)).toBe(
			THREEShapeUtils.isClockWise(THREEPoints),
		);
  });

  it("matches THREE.js triangulation with a hole", () => {
    const contour = [
      new Vector2(0, 0),
      new Vector2(0, 4),
      new Vector2(4, 4),
      new Vector2(4, 0),
    ];
    const holes = [
      [
        new Vector2(1, 1),
        new Vector2(3, 1),
        new Vector2(3, 3),
        new Vector2(1, 3),
      ],
    ];
    const THREEContour = contour.map(
      (point) => new THREE.Vector2(point.x, point.y),
    );
    const THREEHoles = holes.map((hole) =>
      hole.map((point) => new THREE.Vector2(point.x, point.y)),
    );
    expect(triangulateShape(contour, holes)).toEqual(
      THREEShapeUtils.triangulateShape(THREEContour, THREEHoles),
    );
  });

  it("does not mutate duplicate closing points", () => {
    const contour = [
      new Vector2(0, 0),
      new Vector2(0, 2),
      new Vector2(2, 0),
      new Vector2(0, 0),
    ];
    const faces = triangulateShape(contour, []);
    expect(contour).toHaveLength(4);
    expect(faces).toEqual([[1, 0, 2]]);
  });

  it("accepts readonly point data", () => {
    const contour = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ] as const;
    expect(triangulateShape(contour, [])).toHaveLength(1);
  });
});

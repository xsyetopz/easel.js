import { describe, expect, it } from "bun:test";
import { CurvePath } from "@/curves/CurvePath.js";
import { Path } from "@/curves/Path.js";
import { ShapePath } from "@/curves/ShapePath.js";
import { LineCurve } from "@/curves/curves/LineCurve.js";
import { LineCurve3 } from "@/curves/curves/LineCurve3.js";
import { Vector2 } from "@/math/Vector2.js";
import { Vector3 } from "@/math/Vector3.js";

describe("advanced curve API", () => {
  it("computes bounded Frenet frames for a 3D line", () => {
    const curve = new LineCurve3(new Vector3(0, 0, 0), new Vector3(4, 0, 0));
    const frames = curve.computeFrenetFrames(4);
    expect(frames.tangents).toHaveLength(5);
    expect(frames.normals).toHaveLength(5);
    expect(frames.binormals).toHaveLength(5);
    expect(frames.tangents[2].x).toBeCloseTo(1, 6);
    expect(frames.tangents[2].y).toBeCloseTo(0, 6);
  });

  it("invalidates composed length caches only when explicitly requested", () => {
    const path = new CurvePath();
    const segment = new LineCurve(new Vector2(0, 0), new Vector2(1, 0));
    path.add(segment);
    const first = path.curveLengths;
    segment.v2 = new Vector2(3, 0);
    expect(path.curveLengths).toBe(first);
    path.updateArcLengths();
    const second = path.curveLengths;
    expect(second).not.toBe(first);
    expect(path.length).toBeCloseTo(3, 6);
  });

  it("round-trips a composed path through JSON", () => {
    const source = new Path();
    source
      .moveTo(0, 0)
      .lineTo(2, 0)
      .splineThru([new Vector2(3, 1), new Vector2(4, 0)]);
    const restored = new Path().fromJSON(source.toJSON());
    expect(restored.curves).toHaveLength(source.curves.length);
    expect(restored.currentPoint.x).toBeCloseTo(source.currentPoint.x, 6);
    expect(restored.currentPoint.y).toBeCloseTo(source.currentPoint.y, 6);
    expect(restored.length).toBeCloseTo(source.length, 6);
  });

  it("classifies nested ShapePath contours into holes", () => {
    const shapePath = new ShapePath();
    shapePath
      .moveTo(0, 0)
      .lineTo(4, 0)
      .lineTo(4, 4)
      .lineTo(0, 4)
      .lineTo(0, 0)
      .moveTo(1, 1)
      .lineTo(1, 2)
      .lineTo(2, 2)
      .lineTo(2, 1)
      .lineTo(1, 1);
    const shapes = shapePath.toShapes();
    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(1);
  });
});

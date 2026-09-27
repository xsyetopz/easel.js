// EASEL 0.8.0: thresholds are raycaster accessors; there is no `params`.
import {
  Attribute, Geometry, Line, Points, PointsMaterial, Raycaster, Vector3,
} from "@xsyetopz/easel";

function geometry(values: number[]): Geometry {
  const result = new Geometry();
  result.setAttribute("position",
    new Attribute(new Float32Array(values), 3));
  return result;
}

export function hits(threshold: number) {
  const points = new Points(geometry([0.5, 0, 0]), new PointsMaterial());
  const line = new Line(geometry([0.5, -1, 0, 0.5, 1, 0]));
  points.updateMatrixWorld();
  line.updateMatrixWorld();
  const raycaster = new Raycaster(new Vector3(0, 0, 5),
    new Vector3(0, 0, -1));
  raycaster.pointsThreshold = threshold;
  raycaster.lineThreshold = threshold;
  return {
    points: raycaster.intersectObject(points).length,
    line: raycaster.intersectObject(line).length,
  };
}

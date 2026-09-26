// EASEL 0.7.0: one Attribute class over an explicit typed array, and a Map
// of attributes read through getAttribute().
import { Attribute, Geometry } from "@xsyetopz/easel";

export function run() {
  const geometry = new Geometry();
  geometry.setAttribute("position", new Attribute(
    new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3));
  geometry.index = new Uint16Array([0, 1, 2]);
  const position = geometry.getAttribute("position");
  return {
    names: [...geometry.attributes.keys()],
    count: position?.count ?? 0,
    x1: position?.getX(1) ?? NaN,
    indexType: geometry.index?.constructor.name ?? "none",
  };
}

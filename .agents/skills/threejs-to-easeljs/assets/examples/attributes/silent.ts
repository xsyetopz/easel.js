// Naive ports that type-check: object iteration over a Map, and a plain
// array where three.js used a non-float attribute type.
import { Attribute, Geometry } from "@xsyetopz/easel";

export function names(): string[] {
  const geometry = new Geometry();
  geometry.setAttribute("position", new Attribute([0, 0, 0], 3));
  return Object.keys(geometry.attributes);
}

export function colorType(): string {
  // three.js: new THREE.Uint8BufferAttribute([255, 0, 0], 3, true)
  return new Attribute([255, 0, 0], 3, true).array.constructor.name;
}

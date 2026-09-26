// three.js r186: typed attribute subclasses and a plain-object map.
import * as THREE from "three";

export function run() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position",
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  geometry.setIndex(new THREE.Uint16BufferAttribute([0, 1, 2], 1));
  const position = geometry.attributes.position;
  return {
    names: Object.keys(geometry.attributes),
    count: position.count,
    x1: position.getX(1),
    indexType: geometry.index.array.constructor.name,
  };
}

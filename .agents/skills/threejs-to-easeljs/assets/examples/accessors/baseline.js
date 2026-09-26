// three.js r186: getX()/setX() methods.
import * as THREE from "three";

export function run() {
  const color = new THREE.Color();
  color.setHex(0x3366cc);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  return {
    hex: color.getHex(),
    hexString: color.getHexString(),
    style: color.getStyle(),
    index: Array.from(geometry.getIndex().array),
    empty: new THREE.Box3().isEmpty(),
  };
}

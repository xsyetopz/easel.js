// three.js r186: Mesh*/Line* material names; vertexColors defaults to false.
import * as THREE from "three";

export function run() {
  const basic = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lambert = new THREE.MeshLambertMaterial({ color: 0x44aa88 });
  const line = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const dashed = new THREE.LineDashedMaterial({ dashSize: 3, gapSize: 1 });
  return {
    types: [basic.type, lambert.type, line.type, dashed.type],
    vertexColors: basic.vertexColors,
  };
}

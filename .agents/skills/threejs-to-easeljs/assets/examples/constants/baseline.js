// three.js r186: flat numeric constants on the THREE namespace.
import * as THREE from "three";

export function run() {
  const texture = new THREE.Texture();
  texture.wrapS = THREE.RepeatWrapping;
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  return {
    wrapS: texture.wrapS,
    side: material.side,
    loop: THREE.LoopRepeat,
  };
}

// three.js r186: TextureLoader.load returns the Texture immediately.
// Needs image decoding in a browser, so it is type-checked only.
import * as THREE from "three";

export function material(url) {
  const texture = new THREE.TextureLoader().load(url);
  return new THREE.MeshLambertMaterial({ map: texture });
}

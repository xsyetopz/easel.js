// three.js r186: a 256x256 DataTexture from a Uint8Array, sampled whole.
import * as THREE from "three";

export const SIZE = 256;

export function checker(size) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = ((x >> 4) + (y >> 4)) % 2 === 0 ? 255 : 0;
      data.set([on, on, on, 255], (y * size + x) * 4);
    }
  }
  return data;
}

export function build() {
  const texture = new THREE.DataTexture(checker(SIZE), SIZE, SIZE);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

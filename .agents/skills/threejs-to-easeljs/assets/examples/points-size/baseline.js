// three.js r186: `size` is a point diameter. With sizeAttenuation false it
// is in pixels; with the default true it is scaled by (height / 2) / depth.
// Points can sample `map` and discard texels below `alphaTest`.
import * as THREE from "three";

export function markers(map) {
  return new THREE.PointsMaterial({
    color: 0xffcc00,
    size: 5,
    sizeAttenuation: false,
    map,
    alphaTest: 0.5,
  });
}

export function dust() {
  return new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
}

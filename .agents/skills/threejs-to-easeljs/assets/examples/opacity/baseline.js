// three.js r186: continuous alpha, 0 transparent through 1 opaque.
import * as THREE from "three";

export function glassPanel() {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
  });
}

export function solidPanel() {
  return new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 1 });
}

// three.js r186: absence is null (parent, background, map).
import * as THREE from "three";

export function findRoots(scene) {
  const roots = [];
  scene.traverse((node) => {
    if (node.parent === null) roots.push(node.name);
  });
  return roots;
}

export function build() {
  const scene = new THREE.Scene();
  scene.name = "scene";
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  mesh.name = "box";
  scene.add(mesh);
  scene.background = null;
  mesh.material.map = null;
  return { roots: findRoots(scene), background: scene.background };
}

// three.js r186: PBR material, shadow maps, public LightShadow.
import * as THREE from "three";

export function build(renderer) {
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial({ color: 0x44aa88, roughness: 0.4 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(light, mesh);
  return scene;
}

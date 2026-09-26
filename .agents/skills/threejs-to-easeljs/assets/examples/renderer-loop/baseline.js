// three.js r186: WebGL renderer with pixel ratio and a managed loop.
// Needs a WebGL context, so it is type-checked only.
import * as THREE from "three";

export function start(canvas, scene, camera, update) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setClearColor(0x101820);
  renderer.setAnimationLoop((time) => {
    update(time);
    renderer.render(scene, camera);
  });
  return () => {
    renderer.setAnimationLoop(null);
    renderer.dispose();
  };
}

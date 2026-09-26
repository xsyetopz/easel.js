// three.js r186: redraw the canvas, then flag the texture; the renderer
// re-uploads it on the next frame. Needs a DOM canvas: type-checked only.
import * as THREE from "three";

export function hud(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  function redraw(draw) {
    draw(canvas.getContext("2d"));
    texture.needsUpdate = true;
  }
  return { material, redraw };
}

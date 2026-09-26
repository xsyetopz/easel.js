// Naive port that type-checks: three.js's needsUpdate flag alone.
import { BasicMaterial, CanvasTexture } from "@xsyetopz/easel";

export function hud(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  const material = new BasicMaterial({ map: texture });
  function redraw(draw: (canvas: HTMLCanvasElement) => void): void {
    draw(canvas);
    texture.needsUpdate = true;
  }
  return { material, texture, redraw };
}

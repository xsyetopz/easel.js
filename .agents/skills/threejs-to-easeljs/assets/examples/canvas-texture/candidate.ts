// EASEL 0.8.0: the renderer samples a cached copy of the canvas and never
// refreshes it. Flag the texture and rebuild the cache with update() after
// every redraw, including the first draw after construction.
import { BasicMaterial, CanvasTexture } from "@xsyetopz/easel";

export function hud(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  const material = new BasicMaterial({ map: texture });
  function redraw(draw: (canvas: HTMLCanvasElement) => void): void {
    draw(canvas);
    texture.needsUpdate = true;
    texture.update();
  }
  return { material, texture, redraw };
}

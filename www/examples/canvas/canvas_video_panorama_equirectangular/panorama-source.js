// Generated stand-in for textures/pano.webm, shared by both sides so they
// sample the same frames. The upstream video carries no licence notice.

export const PANORAMA_WIDTH = 512;
export const PANORAMA_HEIGHT = 256;

/** Creates the equirectangular source canvas, or undefined without a DOM. */
export function createPanoramaCanvas(ownerDocument) {
  const canvas = ownerDocument?.createElement?.("canvas");
  if (!canvas) return undefined;
  canvas.width = PANORAMA_WIDTH;
  canvas.height = PANORAMA_HEIGHT;
  return canvas;
}

/**
 * Draws one frame of a looping 12-second equirectangular scene: a sky and
 * ground split at the horizon, a sun circling in longitude, and 12 labelled
 * pillars every 30 degrees so the view direction is readable.
 */
export function drawPanoramaFrame(context, timeMs) {
  const w = PANORAMA_WIDTH;
  const h = PANORAMA_HEIGHT;
  const t = (timeMs / 12000) % 1;

  const sky = context.createLinearGradient(0, 0, 0, h / 2);
  sky.addColorStop(0, "#0b1d4a");
  sky.addColorStop(1, "#6fa8dc");
  context.fillStyle = sky;
  context.fillRect(0, 0, w, h / 2);

  const ground = context.createLinearGradient(0, h / 2, 0, h);
  ground.addColorStop(0, "#5d8a3a");
  ground.addColorStop(1, "#1f3312");
  context.fillStyle = ground;
  context.fillRect(0, h / 2, w, h / 2);

  const sunX = t * w;
  context.fillStyle = "#ffd966";
  for (const x of [sunX, sunX - w]) {
    context.beginPath();
    context.arc(x, h * 0.3, 14, 0, Math.PI * 2);
    context.fill();
  }

  context.font = "bold 14px sans-serif";
  context.textAlign = "center";
  for (let i = 0; i < 12; i++) {
    const x = (i + 0.5) * (w / 12);
    context.fillStyle = i % 2 === 0 ? "#c0392b" : "#f39c12";
    context.fillRect(x - 6, h * 0.38, 12, h * 0.24);
    context.fillStyle = "#ffffff";
    context.fillText(String(i * 30), x, h * 0.7);
  }
}

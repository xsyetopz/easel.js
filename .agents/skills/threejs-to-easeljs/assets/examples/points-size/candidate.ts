// EASEL 0.7.0: `size` is a positive integer pixel radius; a point covers
// 2 * size + 1 pixels across at any distance. There is no sizeAttenuation,
// and the point rasterizer uses neither `map` nor an alpha test.
import { PointsMaterial } from "@xsyetopz/easel";

// three.js pixel diameter -> EASEL pixel radius.
export function easelPointSize(threePixels: number): number {
  return Math.max(1, Math.round((threePixels - 1) / 2));
}

// Attenuated three.js size in world units, at a representative depth.
export function attenuatedPixels(
  size: number,
  canvasHeight: number,
  depth: number,
): number {
  return (size * canvasHeight) / 2 / depth;
}

export function markers(): PointsMaterial {
  return new PointsMaterial({
    color: 0xffcc00,
    size: easelPointSize(5), // 2
    vertexColors: false,
  });
}

export function dust(canvasHeight: number, depth: number): PointsMaterial {
  const pixels = attenuatedPixels(0.05, canvasHeight, depth);
  return new PointsMaterial({
    color: 0xffffff,
    size: easelPointSize(pixels),
    vertexColors: false,
  });
}

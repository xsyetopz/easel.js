// EASEL 0.7.0: baked Lambert lighting has no 1/PI term, so divide every
// ported light intensity (directional, point, spot, ambient, hemisphere) by
// Math.PI to start from three.js brightness.
import { AmbientLight, DirectionalLight } from "@xsyetopz/easel";

export function easelIntensity(threeIntensity: number): number {
  return threeIntensity / Math.PI;
}

export function lights(): { sun: DirectionalLight; sky: AmbientLight } {
  const sun = new DirectionalLight(0xffffff, easelIntensity(1));
  sun.position.set(0, 0, 1);
  const sky = new AmbientLight(0xffffff, easelIntensity(1));
  return { sun, sky };
}

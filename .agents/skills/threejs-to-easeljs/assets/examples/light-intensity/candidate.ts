// EASEL 0.8: Lambert lighting includes three.js r186's 1 / PI and sRGB
// colour management, so ported light intensities (directional, point,
// spot, ambient, hemisphere) stay verbatim.
import { AmbientLight, DirectionalLight } from "@xsyetopz/easel";

export function easelIntensity(threeIntensity: number): number {
  return threeIntensity;
}

export function lights(): { sun: DirectionalLight; sky: AmbientLight } {
  const sun = new DirectionalLight(0xffffff, easelIntensity(1));
  sun.position.set(0, 0, 1);
  const sky = new AmbientLight(0xffffff, easelIntensity(1));
  return { sun, sky };
}

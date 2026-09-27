// Stale port that type-checks: the EASEL 0.7 habit of dividing three.js
// intensities by Math.PI, which 0.8 already applies inside the lighting.
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

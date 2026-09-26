// Naive port that type-checks: three.js intensities copied verbatim.
import { AmbientLight, DirectionalLight } from "@xsyetopz/easel";

export function lights(): { sun: DirectionalLight; sky: AmbientLight } {
  const sun = new DirectionalLight(0xffffff, 1);
  sun.position.set(0, 0, 1);
  const sky = new AmbientLight(0xffffff, 1);
  return { sun, sky };
}

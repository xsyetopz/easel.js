// Naive port that type-checks: same arguments, different plane.
import { TorusGeometry } from "@xsyetopz/easel";

export function torus(): TorusGeometry {
  return new TorusGeometry(1, 0.4, 12, 48);
}

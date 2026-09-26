// EASEL 0.7.0: the torus ring lies in the XZ plane (hole along Y). Rotate
// the geometry once to get three.js's vertices exactly.
import { TorusGeometry } from "@xsyetopz/easel";

export function torus(): TorusGeometry {
  const geometry = new TorusGeometry(1, 0.4, 12, 48);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

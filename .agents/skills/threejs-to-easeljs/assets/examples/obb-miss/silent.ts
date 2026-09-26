// Naive port that type-checks: three.js's null test used as a boolean.
import { OBB, Ray, Vector3 } from "@xsyetopz/easel";

export function blocks(origin: [number, number, number]): boolean {
  const box = new OBB(new Vector3(), new Vector3(1, 1, 1));
  const ray = new Ray(new Vector3(...origin), new Vector3(0, 0, -1));
  return box.intersectRay(ray, new Vector3()) !== null;
}

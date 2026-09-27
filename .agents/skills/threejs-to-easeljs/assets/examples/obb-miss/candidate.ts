// EASEL 0.8.0: OBB is a core export and intersectRay returns undefined on
// a miss. Test for undefined, or use intersectsRay for a boolean.
import { OBB, Ray, Vector3 } from "@xsyetopz/easel";

export function hitPoint(origin: [number, number, number]) {
  const box = new OBB(new Vector3(), new Vector3(1, 1, 1));
  const ray = new Ray(new Vector3(...origin), new Vector3(0, 0, -1));
  const hit = box.intersectRay(ray, new Vector3());
  return hit !== undefined ? hit.toArray() : "miss";
}

// EASEL 0.7.0: BoxHelper draws nothing until update(), and a mesh source
// uses its geometry-local boundingBox. Track a world-space Box3 instead and
// refresh both after the matrices are current.
import { Box3, BoxHelper, type Node } from "@xsyetopz/easel";

export function makeHelper(target: Node) {
  const box = new Box3();
  const helper = new BoxHelper(box, 0xffff00);
  function refresh(): void {
    // after renderer.prepare(...) or target.updateMatrixWorld(...)
    box.setFromObject(target);
    helper.update();
  }
  return { helper, refresh };
}

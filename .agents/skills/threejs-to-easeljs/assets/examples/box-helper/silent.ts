// Naive port that type-checks: the world box without the explicit update.
import { Box3, BoxHelper, type Node } from "@xsyetopz/easel";

export function noUpdate(target: Node): BoxHelper {
  return new BoxHelper(new Box3().setFromObject(target), 0xffff00);
}

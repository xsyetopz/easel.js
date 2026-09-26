// Naive port that type-checks: `true` now means updateParents, not force.
import { Node } from "@xsyetopz/easel";

export function run(): number {
  const parent = new Node();
  const child = new Node();
  parent.add(child);
  child.matrixAutoUpdate = false;
  parent.updateMatrixWorld();
  child.matrix.makeTranslation(5, 0, 0);
  parent.updateMatrixWorld(true);
  return child.matrixWorld.elements[12] ?? NaN;
}

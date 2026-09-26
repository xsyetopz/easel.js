// Naive port that type-checks: the null comparison is never true in EASEL.
import type { Node } from "@xsyetopz/easel";

export function findRoots(scene: Node): string[] {
  const roots: string[] = [];
  scene.traverse((node) => {
    if (node.parent === null) roots.push(node.name);
  });
  return roots;
}

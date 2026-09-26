// Naive port that type-checks: three.js root-relative ".position" path.
import { AnimationClip, Animator, Node, VectorTrack } from "@xsyetopz/easel";

export function play(): void {
  const track = new VectorTrack(".position", [0, 1], [0, 0, 0, 2, 4, 0]);
  new Animator(new Node()).clipAction(new AnimationClip("m", -1, [track]));
}

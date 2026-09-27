// EASEL 0.8.0: Animator, VectorTrack, Loop.Repeat. Binding paths have no
// leading dot: three.js ".position" is "position" (or "Box.position").
import {
  AnimationClip,
  Animator,
  Loop,
  Node,
  VectorTrack,
} from "@xsyetopz/easel";

export function sample(times: number[]): number[][] {
  const box = new Node();
  box.name = "Box";
  const track = new VectorTrack("position", [0, 1], [0, 0, 0, 2, 4, 0]);
  const clip = new AnimationClip("move", -1, [track]);
  const animator = new Animator(box);
  animator.clipAction(clip).setLoop(Loop.Repeat, Infinity).play();
  let last = 0;
  return times.map((t) => {
    animator.update(t - last);
    last = t;
    return box.position.toArray();
  });
}

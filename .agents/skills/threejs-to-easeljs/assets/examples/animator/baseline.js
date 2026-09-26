// three.js r186: AnimationMixer with VectorKeyframeTrack.
import * as THREE from "three";

export function sample(times) {
  const box = new THREE.Object3D();
  box.name = "Box";
  const track = new THREE.VectorKeyframeTrack(
    ".position", [0, 1], [0, 0, 0, 2, 4, 0]);
  const clip = new THREE.AnimationClip("move", -1, [track]);
  const mixer = new THREE.AnimationMixer(box);
  mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
  let last = 0;
  return times.map((t) => {
    mixer.update(t - last);
    last = t;
    return box.position.toArray();
  });
}

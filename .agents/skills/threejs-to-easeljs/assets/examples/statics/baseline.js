// three.js r186: static members on classes.
import * as THREE from "three";

export function run() {
  const walk = new THREE.AnimationClip("Walk", 1, [
    new THREE.NumberKeyframeTrack(".position[x]", [0, 1], [0, 2]),
  ]);
  const idle = new THREE.AnimationClip("Idle", 1, []);
  const found = THREE.AnimationClip.findByName([idle, walk], "Walk");
  const missing = THREE.AnimationClip.findByName([idle, walk], "Run");
  return {
    found: found?.name,
    missing,
    up: THREE.Object3D.DEFAULT_UP.toArray(),
    tracks: THREE.AnimationClip.toJSON(walk).tracks,
  };
}

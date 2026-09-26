// Card: references/animation-tracks.md#track-item-size
import {
  AnimationClip,
  Animator,
  Group,
  Interpolation,
  NumberTrack,
  Track,
  VectorTrack,
} from "@xsyetopz/easel";
import { expect, expectThrows } from "./harness.ts";

export function createBobClip(): AnimationClip {
  // Three values per key for a Vector3 property: itemSize 3.
  const position = new Track(
    "Crate.position",
    [0, 1, 2],
    [0, 0, 0, 0, 1, 0, 0, 0, 0],
    { itemSize: 3 },
  );
  // VectorTrack defaults itemSize to 3; NumberTrack forces 1.
  const same = new VectorTrack(
    "Crate.scale",
    [0, 2],
    [1, 1, 1, 1, 1, 1],
  );
  const spin = new NumberTrack("Crate.rotation.y", [0, 2], [0, Math.PI]);
  return new AnimationClip("bob", 2, [position, same, spin]);
}

export function check(): string {
  const message = expectThrows(
    () => new Track("Crate.position", [0, 1], [0, 0, 0, 0, 1, 0]),
    /itemSize/,
  );
  // three.js passes interpolation as the 4th argument; EASEL takes options.
  const step = new NumberTrack("Crate.visible", [0, 1], [0, 1], {
    interpolation: Interpolation.Discrete,
  });

  const root = new Group();
  const crate = new Group();
  crate.name = "Crate";
  root.add(crate);
  const animator = new Animator(root);
  animator.clipAction(createBobClip()).play();
  animator.update(1);
  expect(Math.abs(crate.position.y - 1) < 1e-6, "y should be 1 at t=1");
  expect(step.getValueAtTime(0.9)[0] === 0, "discrete should hold the key");
  return `Track without itemSize for xyz values throws "${message}"; ` +
    `y at t=1 is ${crate.position.y}; discrete value at t=0.9 is ` +
    `${step.getValueAtTime(0.9)[0]}`;
}

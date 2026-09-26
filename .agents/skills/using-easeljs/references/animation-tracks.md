# Animation tracks and loops

Cards for keyframe tracks and the animator in `@xsyetopz/easel` 0.7.0.
Here `Track` replaces three.js `KeyframeTrack`, a `TrackOptions` object
replaces the positional `interpolation` argument, `Loop.Repeat` replaces
`LoopRepeat`, and `Timer` replaces `Clock`. The runnable files are in
`assets/examples/`. The tier is Executed under Bun; the frame-loop part
uses a manually stepped `requestAnimationFrame` and a stub canvas. Local
numbers come from `sh assets/examples/verify.sh examples` on macOS arm64
with Bun 1.4.2 and tsc 7.0.2.

## Contents

- Track item size
- Loop and animator update

## Track item size

**Definition.** The constructor is `new Track(name, times, values,
options?)`. Its fourth argument is `TrackOptions`: `{ itemSize,
interpolation, inTangents, outTangents, endingStart, endingEnd }`.
`itemSize` defaults to `1`. `values.length` must equal `times.length *
itemSize`, or the constructor throws `RangeError("Track values length
must equal times length * itemSize.")`. `times` must be strictly
increasing.

`VectorTrack` defaults `itemSize` to `3`, and `NumberTrack` forces it to
`1` (`src/animation/Track.ts`, `src/animation/tracks/`). For step
sampling, pass `interpolation: Interpolation.Discrete`. The
`Interpolation` values are `Discrete` 2300, `Linear` 2301, `Smooth` 2302,
and `Bezier` 2303.

**Use when.**

- A track animates a vector property such as `.position`, `.scale`, or
  `.quaternion`, or it needs a non-linear interpolation.

**Do not use when.**

- The property is a scalar such as `.rotation.y`. Use `NumberTrack`,
  which always sets `itemSize` to 1; its options type has no `itemSize`.

**Example.**

```ts
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
```

Runnable: `assets/examples/track-item-size.ts`.

**Cost removed.** A `RangeError` at clip construction for any vector
track built three.js-style. Local run: `new Track("Crate.position",
[0, 1], [0, 0, 0, 0, 1, 0])` threw the message above. With
`{ itemSize: 3 }`, `position.y` was 1 at t = 1 s, and a Discrete
`NumberTrack` held 0 at t = 0.9 s.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS track-item-size`.
1. `bun scripts/easel_api.ts show TrackOptions` lists the option fields.

## Loop and animator update

**Definition.** `animator.clipAction(clip)` returns a cached
`AnimationAction`. `action.setLoop(mode, repetitions)` requires both
arguments: `mode` is `Loop.Once` (2200), `Loop.Repeat` (2201), or
`Loop.PingPong` (2202), and `repetitions` is a non-negative integer or
`Infinity`. `Loop.Once` resets the property when the action finishes
unless `action.clampWhenFinished = true`.

`animator.update(delta)` takes seconds. Tracks bind by node name
(`"Crate.position.y"`) under the animator's root. `Timer.update(now)`
takes the `requestAnimationFrame` timestamp in milliseconds and exposes
`delta` in seconds (`src/animation/AnimationAction.ts`,
`src/animation/Animator.ts`, `src/core/Timer.ts`).

**Use when.**

- Playing clips in a frame loop, or porting `AnimationMixer` code.

**Do not use when.**

- Only one property changes every frame with no keyframes. Set that
  property directly in the frame loop.

**Example.**

```ts
export function playForever(
  root: EASEL.Node,
  clip: EASEL.AnimationClip,
): EASEL.Animator {
  const animator = new EASEL.Animator(root);
  animator
    .clipAction(clip)
    .setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY)
    .play();
  return animator;
}

export function startLoop(
  animator: EASEL.Animator,
  renderer: EASEL.Renderer,
  scene: EASEL.Scene,
  camera: EASEL.Camera,
): () => void {
  const timer = new EASEL.Timer();
  let handle = 0;
  const frame = (now: number) => {
    timer.update(now); // rAF milliseconds in, seconds out via delta
    animator.update(timer.delta);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    handle = requestAnimationFrame(frame);
  };
  handle = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(handle);
}
```

Runnable: `assets/examples/loop-animator.ts`.

**Cost removed.** `LoopRepeat is not exported`, actions that snap back
after `Loop.Once`, and animations that run 1000 times too fast. Local run
on a 2 s clip rising from y = 0 to y = 2, at t = 2.5 s:

- `Loop.Repeat` gave y = 0.5.
- `Loop.Once` gave y = 0.
- `Loop.Once` with `clampWhenFinished` gave y = 2.
- `update(16)`, intended as milliseconds, advanced 16 s.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS loop-animator`.
1. `bun scripts/easel_api.ts constants Loop Interpolation` prints the
   numeric values.

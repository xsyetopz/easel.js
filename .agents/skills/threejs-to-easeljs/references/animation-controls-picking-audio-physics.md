# Animation, controls, picking, audio, and physics

## Animation

Map Three `AnimationMixer` to EASEL `Animator`; map number, vector, quaternion, color, boolean, and string keyframe tracks to the corresponding typed tracks. Audit target binding grammar, imported names, interpolation, and action lifecycle.

```ts
const track = new EASEL.VectorTrack(
  "Model.position",
  [0, 1],
  [0, 0, 0, 0, 1, 0],
);
const clip = new EASEL.AnimationClip("move", -1, [track]);
const animator = new EASEL.Animator(scene);
animator.clipAction(clip)
  .setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY)
  .play();
```

Current loop members are `Loop.Once`, `Loop.Repeat`, and `Loop.PingPong`, not historical `LoopRepeat`-style exports. `Timer` replaces Three `Clock` and exposes values such as `delta` and `elapsedTime` around explicit `update()` calls.

Use real clips to verify interpolation, additive blending, action fading and cross-fades, animation groups, root motion, morph tracks, and skin consumption. `GLTFLoader.animations` returns decoded channel records, not automatically constructed EASEL `AnimationClip` instances.

## Controls

EASEL root exports `ArcballControls`, `DragControls`, `FirstPersonControls`, `FlyControls`, `MapControls`, `OrbitControls`, `PointerLockControls`, `TrackballControls`, and `TransformControls`. Keep each imported control at `adapt` until its used surface is checked.

Compare for each control:

- accepted camera or object structure and constructor DOM target;
- pointer-lock ownership and keyboard, mouse, and touch constants;
- option names, defaults, event names, and payloads;
- whether `update()` takes no delta, optional delta, or required delta;
- damping and any change-detection return value;
- `enabled`, reset/save state, attach/detach behavior, and `dispose()`;
- browser focus, pointer capture, CSS coordinate scaling, and framework mount/unmount.

Do not bulk-replace add-on imports because the class names match.

## Picking

Current EASEL perspective and orthographic cameras cache `projectionMatrixInverse` and `matrixWorldInverse`. Prepare matrices and pass the camera directly:

```ts
renderer.prepare(scene, camera);
const rect = canvas.getBoundingClientRect();
const pixelX = (event.clientX - rect.left) * (canvas.width / rect.width);
const pixelY = (event.clientY - rect.top) * (canvas.height / rect.height);
const ndc = {
  x: (pixelX / canvas.width) * 2 - 1,
  y: 1 - (pixelY / canvas.height) * 2,
};
const raycaster = new EASEL.Raycaster();
raycaster.setFromCamera(ndc, camera);
const hits = raycaster.intersectObject(scene, true);
```

The older manual inverse-projection adapter is not required for current EASEL cameras. Test CSS-scaled canvas coordinates and every required object family separately. A public `raycast` method and main-renderer support are independent evidence.

## Audio

EASEL exports `Audio`, `AudioListener`, `PositionalAudio`, `AudioLoader`, and `AudioAnalyzer`. The target spelling is `AudioAnalyzer`, not Three's `AudioAnalyser`.

Treat browser context creation, autoplay activation, graph connections, listener and source orientation, positional attenuation, buffer lifecycle, analyzer output shape, and teardown as adaptations. Exercise failure and suspended-context paths in the supported browsers.

## Physics

Three add-on Ammo, Jolt, or Rapier integrations are not equivalent to EASEL physics classes. Prefer retaining an existing physics engine and copying simulation transforms into EASEL nodes when that boundary meets the application contract.

If replacing the engine, audit collision shapes, units, axes, mass and inertia, fixed versus variable stepping, solver and constraint behavior, sleeping, contacts, determinism, interpolation, worker ownership, and teardown. Keep the physics decision separate from renderer parity and validate representative collisions over deterministic checkpoints.

---
title: "Animate a scene"
description: "Advance keyframe clips with an Animator and clean up active actions."
sidebar:
  order: 7
  label: "Animation"
---

An [`AnimationClip`](/docs/animation/AnimationClip/) groups named keyframe
tracks. An [`Animator`](/docs/animation/Animator/) binds those tracks to one
root object and advances active actions by seconds.

```ts
const clip = new EASEL.AnimationClip("spin", 2, [
  new EASEL.NumberTrack(
    "rotation.y",
    [0, 2],
    [0, Math.PI * 2],
  ),
]);
const animator = new EASEL.Animator(mesh);
const action = animator.clipAction(clip);
action.play();

let previous = performance.now();
function frame(now: number): void {
  const delta = (now - previous) / 1000;
  previous = now;
  animator.update(delta);
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

Keep `delta` in seconds and call `stopAll()` before releasing an animator. Use
`timeScale` for a finite, non-negative speed multiplier, and use `seek()` or
`setTime()` when a UI needs deterministic timeline control. Under
`prefers-reduced-motion`, offer a paused or single-frame path in the host UI.

<figure class="manual-render" data-manual-example="keyframe-timeline">
  <div class="manual-render__stage">
    <canvas width="16" height="9" role="img" aria-label="Position and rotation tracks rendered on a shared timeline.">
      This render needs a Canvas2D-capable browser.
    </canvas>
    <p data-manual-example-status role="status">Loading render…</p>
  </div>
  <figcaption>Position and rotation tracks rendered on a shared timeline.</figcaption>
</figure>

## Related API

- [Animator](/docs/animation/Animator/)
- [AnimationClip](/docs/animation/AnimationClip/)
- [AnimationAction](/docs/animation/AnimationAction/)
- [NumberTrack](/docs/animation/NumberTrack/)

---
title: "Set up cameras and controls"
description: "Choose a perspective or orthographic camera and add disposable controls."
sidebar:
  order: 5
  label: "Cameras and controls"
---

Use [`PerspectiveCamera`](/docs/cameras/PerspectiveCamera/) when depth should
change apparent size. Use [`OrthographicCamera`](/docs/cameras/OrthographicCamera/)
when parallel lines and a stable scale are more useful. Both cameras require a
projection update after changing their projection settings.

```ts
const camera = new EASEL.PerspectiveCamera({
  fov: 60,
  aspect: canvas.width / canvas.height,
  near: 0.01,
  far: 100,
});
camera.position.set(1, 1, 2);
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();
```

[`OrbitControls`](/docs/controls/OrbitControls/) installs pointer, wheel, and
context-menu listeners on a supplied event target. Call `update()` once per
frame and call `dispose()` when the scene or page is torn down.

```ts
const controls = new EASEL.OrbitControls(camera, canvas);
controls.enableDamping = true;

function frame(): void {
  controls.update();
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
// Later, when leaving the page:
controls.dispose();
```

For a responsive canvas, derive the aspect from the drawable size rather than
the CSS width alone. Update `camera.aspect` and call
`camera.updateProjectionMatrix()` after each resize.

## Related API

- [Camera](/docs/cameras/Camera/)
- [PerspectiveCamera](/docs/cameras/PerspectiveCamera/)
- [OrthographicCamera](/docs/cameras/OrthographicCamera/)
- [OrbitControls](/docs/controls/OrbitControls/)

## Try an example

[Try an interactive camera example](/examples/).

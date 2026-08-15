# Controls

All control classes are root exports and operate on CPU scene/camera state.
Concrete constructors install DOM listeners immediately; retain the instance and
call `dispose()` during teardown.

## Choose a control

| Need | Control | Frame call |
| --- | --- | --- |
| orbit, wheel zoom, pan | `OrbitControls` | `update()` |
| top-down horizontal pan | `MapControls` | `update()` |
| free sphere rotation | `ArcballControls` | `update()` |
| legacy trackball motion | `TrackballControls` | `update()` |
| keyboard movement plus pointer look | `FirstPersonControls` | `update(dt)` |
| unconstrained flight | `FlyControls` | `update(dt)` |
| browser pointer lock | `PointerLockControls` | movement methods; no frame `update` |
| drag scene nodes | `DragControls` | event-driven |
| translate/rotate/scale nodes | `TransformControls` | `update()` |

`Controls` is the general base (`connect`, `disconnect`, `update`, `dispose`),
but concrete classes use their documented constructors and may not inherit it.

## Orbit example

```ts
const controls = new EASEL.OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;

function frame(): void {
  controls.update();
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// teardown
controls.dispose();
```

`MapControls` has the same constructor and inherits this API. Orthographic orbit
zoom updates `camera.zoom` and its projection through the control.

## Time-based controls

```ts
const controls = new EASEL.FlyControls(camera, canvas);
controls.movementSpeed = 4;
controls.rollSpeed = 0.5;

function frame(now: number): void {
  const dt = Math.min((now - previous) / 1000, 0.25);
  previous = now;
  controls.update(dt);
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
```

`FirstPersonControls.update(delta?)` also accepts seconds. Call
`handleResize()` on `FirstPersonControls` and `TrackballControls` after the
canvas interaction viewport changes.

## Pointer lock

```ts
const controls = new EASEL.PointerLockControls(camera, canvas);
canvas.addEventListener("click", () => controls.lock());

// in app movement logic
controls.moveForward(forwardDistance);
controls.moveRight(sideDistance);
renderer.prepare(scene, camera);
renderer.render(scene, camera);
```

Pointer-lock acquisition requires a browser user gesture. `unlock()` requests
exit; `dispose()` removes listeners.

## Drag and transform

Public perspective and orthographic cameras supply the matrices required by the
`RaycastCamera` structural type after preparation.

```ts
renderer.prepare(scene, camera);
const drag = new EASEL.DragControls([mesh], camera, canvas);

const transform = new EASEL.TransformControls(camera, canvas);
transform.attach(mesh).setMode("translate");
scene.add(transform.helper);
```

`DragControls` dispatches `hoveron`, `hoveroff`, `dragstart`, `drag`, and
`dragend`. `TransformControls` supports `translate`, `rotate`, and `scale`,
`world`/`local` space, snap setters, explicit pointer methods, and a renderable
CPU gizmo node from `helper`. Dispose each instance and remove its helper when
finished.

Do not run two controls against the same pointer gesture unless application
state disables one while the other is active.

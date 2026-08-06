# Migration to EASEL 0.7.0

**Status**: DRAFT — Major new modules (audio, cameras, controls, curves, exporters, materials, loaders, physics).

## New 0.7.0 modules

| Module | Key exports | Typical usage |
|--------|-------------|---------------|
| **Audio** | `AudioGraph`, `AudioAnalyzer`, `CanvasAudioVisualizer` | `loader.on_finish -> AudioGraph.start()` |
| **Cameras** | `Camera` (base), `OrthographicCamera`, `PerspectiveCamera` | `new PerspectiveCamera({ fov, aspect, near, far })` |
| **Controls** | `OrbitControls`, `ArcballControls`, `FlyControls`, `MapControls`, `PointerLockControls`, `DragControls`, `FirstPersonControls`, `TrackballControls`, `TransformControls` | `const ctrl = new OrbitControls(camera, dom)` |
| **Curves** | `NURBSCurve`, `NURBSSurface`, `NURBSVolume`, `SVGPathParser`, `SVGPathSerializer` | Curve gen + curve path for mesh generators |
| **Exporters** | `EXRExporter`, `GCodeExporter`, `GLTFExporter`, `MTLExporter` | `const res = obj.export(); fs.writeFileSync(out, res)` |
| **Materials** | `BasicMaterial`, `DashedLineMaterial`, `LambertMaterial`, `LineMaterial`, `PointsMaterial`, `ToonMaterial` | New material constructors; base `Material` unifies interface |
| **Loaders** | `BVHLoader`, `GCodeLoader`, `NRRDLoader`, `PDBLoader`, `TTFLoader`, etc. | Async load in `requestAnimationFrame` or `setup` |
| **Physics** | `CharacterController`, `VehicleController`, `ParticleWorld` | External Bullet/Rapier integration (CPU only) |
| **Helpers** | `ArrowHelper`, `PolarGridHelper` | Visual debugging overlays |
| **Pipeline** | `RenderTimings` (profiling), `use: [profileTraversal]` | Performance microprofiling of each stage |

## Common file organization

| Directory | Content | Count (0.7) |
|-----------|---------|-------------|
| `canvas/**` | Raw Canvas2D rendering (geometry, interaction, animation, loader helpers) | ~120 |
| `camera2/**` | Camera projection presets (perspective, ortho, arcball, fly, sprint) | ~40 |
| `camera/**` | Camera controls and utilities | ~10 |
| `css/**` | CSS2D/CSS3D overlay examples | ~10 |
| `css2d/`, `css3d/` | CSS-based 3D overlays (labels, sprites) | ~10 |
| `games/**` | Simple interactive games | ~5 |
| `misc/**` | Utilities (raycaster helpers, uv tests, exporters) | ~10 |
| `physics/**` | Bullet/Rapier-based character/vehicle physics (CPU, external) | ~15 |
| `svg/**` | SVG piping and sandbox | ~2 |
| `webaudio/**` | Audio tools (orientation, sandbox, timing, visualizer) | ~4 |

Total: 203 files across 9 top-level directories.

## Rendering loop upgrade to 0.7

Previously you might have used a handwritten RAF loop:

```ts
function animate(time: number) {
  mesh.rotation.x = time / 2000;
  mesh.rotation.y = time / 1000;
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
```

In 0.7 you can now use `renderer.setAnimationLoop(animate)` (optional) or continue with a custom RAF loop. The renderer contract and performance contract stay the same.

## Migration checklist

- [ ] Replace global `AudioContext` with `AudioGraph(scene.assign?)` for spatial audio.
- [ ] Use `SpanPerspectiveCamera` (or `PerspectiveCamera`) and `SpanOrthographicCamera` (or `OrthographicCamera`) constructors with `aspect` updated on resize.
- [ ] Adopt new control sets (`FlyControls`, `MapControls`, etc.) for specific use-cases; keep `OrbitControls` for orbit pan.
- [ ] Replace old 0.6-only loaders/exporters with the new 0.7 classes that match your format.
- [ ] Use `RenderTimings` for profiling if you ever hit CPU budgets: `const timings = { profileTraversal: true }; renderer.render(scene, camera, timings);`
- [ ] Check project README and docs for `using-easeljs/SKILL.md` for up-to-date `REVISION = "0.7.0"`.

## Sample three.js → easel conversion

See `references/three-box-to-easel.md` for the full Three.js `BoxGeometry` + `MeshNormalMaterial` demo converted to EASEL 0.7.

# THREE.js Migration

EASEL.js mirrors useful THREE.js concepts, but use EASEL.js class
names/signatures.

| THREE.js concept      | EASEL.js 0.6.1                            |
| --------------------- | ----------------------------------------- |
| `Scene`               | `Scene`                                   |
| `Object3D`            | `Node`                                    |
| `Group`               | `Group`                                   |
| `Mesh`                | `Mesh`                                    |
| `PerspectiveCamera`   | `PerspectiveCamera`                       |
| `OrthographicCamera`  | `OrthographicCamera`                      |
| `BufferGeometry`      | `Geometry`                                |
| `MeshBasicMaterial`   | `BasicMaterial`                           |
| `MeshLambertMaterial` | `LambertMaterial`                         |
| `Texture`             | `Texture`, `DataTexture`, `CanvasTexture` |
| `WebGLRenderer`       | `Renderer` CPU/Canvas2D renderer          |

Porting recipe (verify each step against `reference/grounding.md` and resolved
declarations):

1. Replace renderer setup with `new EASEL.Renderer({ width, height, canvas })`.
2. Replace `BufferGeometry` attributes with `Geometry.setPositions`,
   `setNormals`, `setUVs`, `setIndex`.
3. Replace mesh material class names.
4. Remove GPU-specific code and shader/material node code.
5. Convert positional camera construction to EASEL.js object options, then
   confirm camera aspect updates and the render loop. For example:

   ```ts
   const camera = new EASEL.PerspectiveCamera({
     fov,
     aspect,
     near,
     far,
   });
   // OrthographicCamera likewise takes { left, right, top, bottom, near, far }.
   ```

## Behavior differences to call out

- `Renderer` is CPU-only Canvas2D; remove `WebGLRenderer` context setup and GPU
  resource disposal rather than preserving it behind flags.
- `Geometry` stores CPU attributes. Rebuild positions, normals, UVs, colors, and
  indices through its verified setters instead of copying GPU buffer objects.
- Material transparency is opt-in and uses a discrete inverted scale: set
  `transparent: true`, then map a THREE.js alpha approximately with
  `opacity = Math.round((1 - alpha) * 8)` (`0` opaque, `8` nearly transparent).
  Verify the visual result rather than treating EASEL.js `opacity` as a CSS or
  THREE.js float alpha.
- Texture UV interpolation is affine and source textures clamp to 128×128 with
  nearest-neighbor sampling. Perspective-camera texture warping is expected.
- A `Scene.background` texture is a screen-space clear, not a THREE.js material
  or skybox. Fog color overrides it during the clear.
- `Raycaster.setFromCamera` accepts a structural camera adapter with `type`,
  `matrixWorld`, and an inverse projection matrix. Build that inverse from
  `camera.projectionMatrix` with `new EASEL.Matrix4().copy(...).invert()`; do
  not pass the public camera instance directly.
- Report unsupported postprocessing, shader nodes, shadow maps, PBR, and
  environment maps as `UNKNOWN` unless an explicit CPU design is approved.

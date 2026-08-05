# THREE.js to EASEL.js Reference

Target API: `@xsyetopz/easel@0.6.1` in this repository. This skill is
independent: verify the target project declarations using
`references/grounding.md` before applying a mapping.

## Lookup order

1. `references/threejs-migration.md` for the concept map and porting sequence.
2. `references/grounding.md` for verified EASEL.js 0.6.1 constraints and type
   anchors.
3. Installed `node_modules/@xsyetopz/easel/dist/` declarations, or local
   `src/`/`dist/` declarations in an EASEL.js checkout.
4. `UNKNOWN` with the exact symbol and declaration path when no target API is
   verified. Keep the missing behavior explicit until a target-side design is
   verified.

## Core mapping

| THREE.js              | EASEL.js 0.6.1                       |
| --------------------- | ------------------------------------ |
| `Object3D`            | `Node`                               |
| `BufferGeometry`      | `Geometry`                           |
| `WebGLRenderer`       | `Renderer` (Canvas2D CPU rasterizer) |
| `MeshBasicMaterial`   | `BasicMaterial`                      |
| `MeshLambertMaterial` | `LambertMaterial`                    |
| `MeshToonMaterial`    | `ToonMaterial`                       |
| `AnimationMixer`      | `Animator`                           |
| `KeyframeTrack`       | `Track`                              |

## Completion checklist

- Keep a real browser canvas and a working `renderer.render(scene, camera)`
  loop.
- Rebuild geometry with verified `Geometry` buffers and EASEL primitive classes.
- Replace unsupported shaders, GPU buffers, postprocessing, and shadow systems
  with an explicitly approved CPU-side design or report `UNKNOWN`.
- Verify `scene.background`/fog precedence and affine texture behavior where the
  source scene relied on a renderer clear or texture projection.
- Run the target project's typecheck and a minimal browser render before
  claiming the migration complete.

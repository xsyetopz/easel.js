# Boundaries and library identity

Read this before translating from another renderer or considering a backend
feature. EASEL.js is `@xsyetopz/easel`, not CreateJS EaselJS; its renderer is a
CPU software rasterizer that uploads to Canvas2D, not a WebGL/WebGPU backend.
THREE.js and CreateJS names below are intentional disambiguation rules.

## CreateJS EaselJS comparison

This skill targets `@xsyetopz/easel`, not CreateJS EaselJS. Use capability
comparison to choose patterns.

| Capability     | `@xsyetopz/easel`                         | CreateJS EaselJS pattern             |
| -------------- | ----------------------------------------- | ------------------------------------ |
| Package import | `@xsyetopz/easel`                         | often `createjs`/`@createjs/easeljs` |
| Renderer       | `Renderer` CPU 3D rasterizer              | `Stage` 2D display list              |
| Scene root     | `Scene`                                   | `Stage`                              |
| Containers     | `Group`/`Node`                            | `Container`                          |
| Shapes         | triangulated `Geometry` + `Mesh`          | `Shape.graphics` drawing commands    |
| Animation      | `Animator`/`AnimationClip`/`Track`        | `Ticker`/tweens                      |
| Camera         | `PerspectiveCamera`, `OrthographicCamera` | not a core 3D camera concept         |

When a project imports `@xsyetopz/easel`, use this skill’s scene/camera/geometry
recipes. When a project imports `createjs`, inspect that project separately.

## WebGL/WebGPU comparison

Backend capability matrix:

| Capability            | EASEL.js baseline                                                                  |
| --------------------- | ---------------------------------------------------------------------------------- |
| GPU device            | not part of public renderer setup                                                  |
| WebGL context         | not needed for `Renderer`                                                          |
| WebGPU adapter/device | not needed for `Renderer`                                                          |
| Shader strings        | not the material model in this package                                             |
| Canvas target         | Canvas2D upload from CPU framebuffer                                               |
| Materials             | CPU rasterizer materials like `BasicMaterial`, `LambertMaterial`, `ToonMaterial`   |
| Profiling             | timing fields on the structural third `render` argument, browser performance tools |

For shader or GPU compute requests, either choose a different library/skill or
implement a CPU-side visual effect using geometry/material/texture updates.

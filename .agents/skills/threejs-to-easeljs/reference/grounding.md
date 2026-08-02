# EASEL.js 0.6.1 Grounding

Use these anchors while translating; they are deliberately concise so this skill
does not depend on the general EASEL.js skill.

## Package and declarations

- Package: `@xsyetopz/easel`, API revision `0.6.1`.
- Public export index: `src/index.ts` in an easel.js checkout or
  `node_modules/@xsyetopz/easel/dist/index.d.ts` in an installed project.
- Verify with `console.log(EASEL.REVISION)` and inspect the resolved package's
  `package.json`; do not substitute a published older version silently.
- Preferred browser import: `import * as EASEL from "@xsyetopz/easel";`.
- On 2026-08-02 npm and JSR reported `0.6.0` as latest while this checkout is
  `0.6.1`; remote 0.6.1 installs require publication, so use local source and
  declarations for migration validation until then.

## Rendering boundary

`Renderer` accepts `{ width, height, canvas, pixelRatio }`, renders a `Scene`
from a concrete `PerspectiveCamera` or `OrthographicCamera`, and uploads a CPU
framebuffer to Canvas2D. There is no public GPU device, context, shader, buffer,
shadow-map, PBR, or environment-map lifecycle to preserve.

## Scene and textures

`Scene.background` is `Color | number | Texture | undefined`. A ready texture is
stretched to the framebuffer in screen space with nearest-neighbor samples. If
fog is set, the fog color overrides the background for the initial clear;
geometry is then rasterized with that fog color. Auto-updating background
textures refresh before clear only when fog is absent.

## Porting evidence

When a THREE.js symbol has no obvious EASEL.js equivalent, inspect declarations
before writing code. Cite the exact file and symbol in the migration note. A
different package or a GPU-only behavior is not evidence that EASEL.js supports
it.

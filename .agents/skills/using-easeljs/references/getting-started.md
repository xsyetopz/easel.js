# Getting started

Baseline: `@xsyetopz/easel@0.7.0`. Preserve an existing installed version
unless the task explicitly upgrades it, then inspect that version's declarations.

## Identity and runtime

- Package: `@xsyetopz/easel`
- Revision constant: `REVISION === "0.7.0"`
- Target: browser `HTMLCanvasElement` and Canvas2D
- Backend: CPU software rasterizer followed by `ImageData` upload
- Root entries: ESM `dist/index.es.js`, CommonJS `dist/index.cjs`, declarations
  `dist/index.d.ts`
- Exported package subpaths: root (`.`) only

This is not CreateJS EaselJS. `createjs.Stage`, `Ticker`, `Bitmap`, and display
list recipes do not apply.

## Install and import

```bash
bun add @xsyetopz/easel@0.7.0
```

If 0.7.0 is not yet available from the selected registry, validate against the
repository source/declaration build or wait for publication; do not silently
downgrade examples to an older API.

```ts
import * as EASEL from "@xsyetopz/easel";
// or verified root names
import { PerspectiveCamera, Renderer, Scene } from "@xsyetopz/easel";

if (EASEL.REVISION !== "0.7.0") {
  console.warn(`Skill baseline is 0.7.0; installed ${EASEL.REVISION}`);
}
```

CommonJS uses the package root:

```js
const EASEL = require("@xsyetopz/easel");
```

For Deno import modes, use [the Deno guide](deno.md). Do not import `src/*` or
other package subpaths from app code because `package.json` does not export them.

## Minimal browser frame

```ts
import * as EASEL from "@xsyetopz/easel";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("Missing #scene canvas");

const renderer = new EASEL.Renderer({ width: 320, height: 180, canvas });
renderer.clearColor = 0x101418;
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 60,
  aspect: 320 / 180,
  near: 0.1,
  far: 100,
});
camera.position.set(2, 2, 4);
camera.updateMatrixWorld(false, false, true);
camera.lookAt(0, 0, 0);
camera.updateMatrix();

const geometry = new EASEL.BoxGeometry(1, 1, 1);
const material = new EASEL.BasicMaterial({ color: 0x66ccff });
const mesh = new EASEL.Mesh(geometry, material);
scene.add(mesh);

let frameId = 0;
function frame(): void {
  mesh.rotation.y += 0.02;
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(frame);
}
frameId = requestAnimationFrame(frame);

function dispose(): void {
  cancelAnimationFrame(frameId);
  geometry.dispose();
  material.dispose();
  renderer.dispose();
}
```

A CLI typecheck proves types only. Validate rendering in a browser with a real
Canvas2D context.

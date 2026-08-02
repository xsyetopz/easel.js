# Getting started

Use this guide when adding `@xsyetopz/easel`, identifying EASEL.js, or checking
the package/version before writing a scene. The bundled baseline is
`@xsyetopz/easel@0.6.1`; preserve the installed project version when one is
already present.

## Contents

- [Identity and runtime](#identity-and-runtime)
- [Install and first validation](#install-and-first-validation)
- [Import modes](#import-modes)
- [Version provenance](#version-provenance)
- [Boundaries](#boundaries)

## Identity and runtime

This skill covers `@xsyetopz/easel`, also called EASEL.js in the project docs.

Package identity:

- npm/JSR name: `@xsyetopz/easel`
- Runtime target: browser Canvas2D
- Rendering model: CPU software rasterizer
- Scene API style: THREE.js-like scene graph
- Baseline version in this skill: `0.6.1`

Capability boundary framing:

| If the task says...               | Ground to...                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------- |
| "EASEL.js"                        | `@xsyetopz/easel` package unless the repo imports something else                |
| "easeljs.org"                     | This package’s docs/site                                                        |
| "EaselJS" with `createjs` imports | Different library family; inspect actual package/imports before mixing patterns |
| "CPU/Canvas 3D"                   | `Renderer` + software rasterizer + Canvas2D upload                              |
| "like THREE.js"                   | Use concept mapping, then confirm class names/signatures in API docs            |

Preferred import style:

```ts
import * as EASEL from "@xsyetopz/easel";
```

Named imports are also valid when the symbol appears in the
[API exports](api-exports.md) index:

```ts
import { PerspectiveCamera, Renderer, Scene } from "@xsyetopz/easel";
```

## Install and first validation

1. Detect the runtime and package manager from project files.
2. Prefer the installed project version unless the user asks to upgrade.
3. Use `@xsyetopz/easel@0.6.1` when no project version exists.
4. Verify the import with `EASEL.REVISION` before writing larger scene code.
5. Verify a real `HTMLCanvasElement` render before adding controls, loaders, or
   game logic.

Do not infer the package manager from a filename alone; reconcile lockfiles and
existing imports first.

Install with Bun:

```bash
bun add @xsyetopz/easel@0.6.1
```

These commands intentionally pin the 0.6.1 API. If the selected registry has not
published 0.6.1 yet, validate against the local easel.js source rather than
silently installing an older release. For Deno, use the [Deno guide](deno.md).

Minimal runtime requirements:

- Browser DOM with `HTMLCanvasElement`.
- Canvas2D support.
- TypeScript or JavaScript ESM support.
- A render loop using `requestAnimationFrame`.

First validation:

```ts
console.log(EASEL.REVISION);
```

Expected API revision: `0.6.1`.

## Import modes

Choose one import mode from project evidence. Do not mix npm bare imports, Deno
`npm:` specifiers, and Deno `jsr:` specifiers in the same file unless the
existing project already does.

The package exports root ESM, CommonJS, and declarations (app code should not
guess source subpaths):

```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.es.js",
    "require": "./dist/index.cjs"
  },
  "./src/*": "./src/*"
}
```

Install from JSR with Bun:

```bash
bunx jsr add @xsyetopz/easel@0.6.1
```

Browser bundler ESM uses the bare import and named-import form shown in the
identity section above; do not add package subpaths.

Deno import options:

```ts
import * as EASEL from "npm:@xsyetopz/easel@0.6.1";
```

Use `jsr:` for JSR-native Deno projects:

```ts
import * as EASEL from "jsr:@xsyetopz/easel@0.6.1";
```

For browser-style bare imports, use an import map:

```json
{
  "imports": {
    "@xsyetopz/easel": "jsr:@xsyetopz/easel@0.6.1"
  }
}
```

Then code can use the normal bare import:

```ts
import * as EASEL from "@xsyetopz/easel";
```

CommonJS uses the package `require` export:

```js
const EASEL = require("@xsyetopz/easel");
```

## Version provenance

Source/API baseline: `@xsyetopz/easel@0.6.1` (the current repository revision
and declarations used to generate this skill).

Source and registry facts gathered on 2026-08-02:

- npm package: <https://www.npmjs.com/package/@xsyetopz/easel>
- npm registry latest observed: `0.6.0`
- JSR package: <https://jsr.io/@xsyetopz/easel>
- JSR latest observed: `0.6.0`
- GitHub repository: <https://github.com/xsyetopz/easel.js>
- Project site: <https://easeljs.org>
- Package description: Canvas2D software renderer and CPU rasterizer with a
  THREE.js-style scene graph API.
- Package entry points: ESM `./dist/index.es.js`, CJS `./dist/index.cjs`, types
  `./dist/index.d.ts`.

When exact currentness matters, inspect local
`node_modules/@xsyetopz/easel/package.json` first, then package registry
metadata.

The bundled references and templates intentionally target the 0.6.1 API. At the
observation date, npm and JSR had not published 0.6.1, so the version-pinned
install commands and templates require that release to be published before they
can resolve remotely. Do not silently downgrade the API baseline; in an easel.js
checkout, validate against local `package.json`, `src/index.ts`, and declaration
output instead.

Relevant release deltas reflected here:

- 0.6.0 added screen-space `Texture` scene backgrounds.
- 0.6.1 fixed horizontal scanline clipping in the CPU rasterizer.

## Boundaries

- Do not use `createjs` imports; that is CreateJS EaselJS, not this package.
- Do not import source subpaths for app code unless debugging package internals.
- Do not render in server-only code unless a DOM/canvas-compatible environment
  is explicitly provided.
- Do not introduce WebGL/WebGPU setup or use Deno CLI/headless code as proof of
  browser rendering; rendering still needs a DOM canvas.

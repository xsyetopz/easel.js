# Deno

Read this only for a Deno-managed browser application. For shared package
identity and import choices, start with the
[getting-started guide](getting-started.md).

Use when a project uses Deno to manage TypeScript, imports, tasks, or browser
app serving.

## Contents

- [Agent Rule](#agent-rule)
- [Choose One Import Mode](#choose-one-import-mode)
- [Minimal Browser Entry](#minimal-browser-entry)
- [Validate](#validate)
- [Do Not](#do-not)

## Agent Rule

EASEL.js rendering is browser-canvas rendering. Deno can manage, typecheck, and
serve the app, but render code still runs in a browser with `HTMLCanvasElement`
and Canvas2D.

## Choose One Import Mode

Use `npm:` when matching npm/Bun/Node examples:

```ts
import * as EASEL from "npm:@xsyetopz/easel@0.7.0";
```

Use `jsr:` for JSR-native Deno projects:

```ts
import * as EASEL from "jsr:@xsyetopz/easel@0.7.0";
```

This pin requires a published JSR 0.7.0 package. If it does not resolve, use a
local 0.7.0 checkout/declaration build for validation rather than downgrading
the code to an older API.

Use `deno.json` imports when code should keep bare package imports:

```json
{
    "imports": {
        "@xsyetopz/easel": "jsr:@xsyetopz/easel@0.7.0"
    },
    "compilerOptions": {
        "lib": ["dom", "dom.iterable", "es2022"],
        "strict": true
    },
    "tasks": {
        "check": "deno check src/main.ts",
        "build": "deno bundle src/main.ts --output dist/main.js",
        "dev": "deno task build && deno run --allow-net --allow-read jsr:@std/http/file-server ."
    }
}
```

The template omits a lockfile so the copied project can resolve and create its
own lock with `deno cache src/main.ts` or `deno task check`.

## Minimal Browser Entry

```ts
import * as EASEL from "@xsyetopz/easel";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("Missing #scene canvas");

const renderer = new EASEL.Renderer({ width: 320, height: 180, canvas });
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
scene.add(
    new EASEL.Mesh(
        new EASEL.BoxGeometry(1, 1, 1),
        new EASEL.BasicMaterial({ color: 0x66ccff }),
    ),
);

function frame(): void {
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
}
frame();
```

The public `Scene` and concrete camera are accepted directly by
`Renderer.prepare` and `Renderer.render`, including with
`exactOptionalPropertyTypes`.

## Validate

```bash
deno check src/main.ts
deno task check
deno task build
deno task dev
```

Browser console check:

```ts
console.log(EASEL.REVISION);
```

Expected API revision: `0.7.0`.

## Do Not

- Do not promise headless rendering from plain Deno CLI.
- Do not use Node-only globals in Deno browser entries.
- Do not mix `npm:` and `jsr:` imports in one source file.
- Do not point browser HTML directly at `.ts` files unless the dev server
  transpiles them.
- Do not point browser HTML at `jsr:` specifiers directly; bundle or use a
  browser-aware dev server.
- Do not replace `requestAnimationFrame` with Deno timers for browser rendering.

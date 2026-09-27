# Starter templates

This card covers the starter projects in `assets/templates/`. Each one
renders a cube or a voxel slab with `prepare` then `render` and cleans up
on `pagehide`. `sh assets/examples/verify.sh templates` copies each
template into a temporary directory, installs it from the registries,
and then type-checks, builds, and smoke-runs it.

## Starter templates

**Definition.** Each template is a standalone project tree. The Node
templates pin exact versions: `@xsyetopz/easel` 0.8.0, `typescript`
7.0.2, `vite` 8.3.1, `astro` 7.3.5, `react` and `react-dom` 19.3.0,
`@types/react` and `@types/react-dom` 19.3.0, and `@vitejs/plugin-react`
6.1.1. The TypeScript, Vite, and Astro versions match the repository's
root `package.json`. The React packages were checked with `npm view` on
2026-09-26. The Deno template imports `jsr:@xsyetopz/easel@0.8.0`.

| Template | Use for | Verified by `verify.sh templates` |
| --- | --- | --- |
| `vite-vanilla-ts` | Vite + plain TypeScript page | install, typecheck, build, smoke |
| `react-canvas` | React component owning a canvas | install, typecheck, build |
| `astro-canvas` | Astro static page with a client script | install, typecheck, build, smoke |
| `deno-browser` | Deno-managed browser bundle | `deno check`, `deno bundle`, smoke |
| `voxel-world-starter` | Chunk mesher with the `index` accessor | install, typecheck, build, smoke |

"Smoke" runs the entry module under Bun with a stub `document`, a stub
canvas, and a stepped `requestAnimationFrame`
(`scripts/smoke_entry.ts`). It passes when two frames upload visible
pixels and `pagehide` cancels the loop. None of the templates was opened
in a real browser.

**Use when.**

- Starting a new app on EASEL, or reproducing a bug in a minimal project.

**Do not use when.**

- The host project already has a bundler. Copy only the entry code, and
  keep the host's own version pins.

**Example.**

```sh
cp -R .agents/skills/using-easeljs/assets/templates/vite-vanilla-ts my-app
cd my-app
bun install
bun run typecheck
bun run build
```

The entry's camera setup (`vite-vanilla-ts/src/main.ts`):

```ts
camera.position.set(2, 2, 4);
camera.updateMatrixWorld(); // lookAt reads matrixWorld
camera.lookAt(0, 0, 0);
```

**Cost removed.** Scaffolding rebuilt by hand with stale pins. Local run
(macOS arm64, Bun 1.4.2, Deno 2.9.6 through `bunx deno`, network to npm
and JSR): all 21 template steps printed `PASS`. The run also
type-checked and executed every example against the published npm
package instead of the repository source, and that passed too.

**Verify.**

1. `sh assets/examples/verify.sh templates` prints `PASS` for each
   template step. Without network access it prints
   `SKIP templates: npm registry unreachable`.
1. In a real browser, open the dev server (`bun run dev`, or
   `deno task serve` after `deno task build`) and check that the canvas
   shows the shape. The verifier does not do this.

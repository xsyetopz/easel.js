# Templates

Templates are copyable project trees, not reference prose. Copy one from
`assets/templates/` only after choosing a runtime; preserve its standalone
`tsconfig` files and root `@xsyetopz/easel` imports. The package and Deno
templates pin the verified `0.6.1` baseline. At the observation date, npm and
JSR exposed `0.6.0`, so remote install/check commands remain blocked until
`0.6.1` is published; do not downgrade the templates.

| Use when                                   | Asset                                                             | Copy command                                                                             | Install command   | Check command                        | Registry caveat                |
| ------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------- | ------------------------------------ | ------------------------------ |
| Vite + vanilla TypeScript browser scene    | [`vite-vanilla-ts`](../assets/templates/vite-vanilla-ts/)         | `cp -R .agents/skills/using-easeljs/assets/templates/vite-vanilla-ts ./my-easel-app`     | `bun install`     | `bun run typecheck`                  | Requires published npm `0.6.1` |
| React + Vite canvas component              | [`react-canvas`](../assets/templates/react-canvas/)               | `cp -R .agents/skills/using-easeljs/assets/templates/react-canvas ./my-easel-app`        | `bun install`     | `bun run typecheck`                  | Requires published npm `0.6.1` |
| Astro static page with browser scene       | [`astro-canvas`](../assets/templates/astro-canvas/)               | `cp -R .agents/skills/using-easeljs/assets/templates/astro-canvas ./my-easel-app`        | `bun install`     | `bun run typecheck && bun run build` | Requires published npm `0.6.1` |
| Deno-managed browser bundle/server         | [`deno-browser`](../assets/templates/deno-browser/)               | `cp -R .agents/skills/using-easeljs/assets/templates/deno-browser ./my-easel-app`        | `deno task check` | `deno task check && deno task build` | Requires published JSR `0.6.1` |
| Chunked voxel starter with copyable mesher | [`voxel-world-starter`](../assets/templates/voxel-world-starter/) | `cp -R .agents/skills/using-easeljs/assets/templates/voxel-world-starter ./my-easel-app` | `bun install`     | `bun run typecheck`                  | Requires published npm `0.6.1` |

After copying, run the native install/check commands from the new project. The
Deno template intentionally has no lockfile until its pinned JSR release is
published; use `deno cache src/main.ts` or `deno task check` to create one.

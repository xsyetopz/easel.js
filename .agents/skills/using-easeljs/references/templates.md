# Templates

Copy one standalone tree from `assets/templates/` after choosing the runtime.
All package manifests pin the verified 0.7.0 baseline and import only the
package root.
Remote installs require registry publication of 0.7.0. If resolution fails,
validate with a local 0.7.0 package build; do not change the templates to an
older API.

| Use when | Asset | Install/check |
| --- | --- | --- |
| Vite + vanilla TypeScript | [`vite-vanilla-ts`](../assets/templates/vite-vanilla-ts/) | `bun install && bun run typecheck` |
| React + Vite canvas component | [`react-canvas`](../assets/templates/react-canvas/) | `bun install && bun run typecheck` |
| Astro static browser page | [`astro-canvas`](../assets/templates/astro-canvas/) | `bun install && bun run typecheck && bun run build` |
| Deno-managed browser app | [`deno-browser`](../assets/templates/deno-browser/) | `deno task check && deno task build` |
| Chunked voxel starter | [`voxel-world-starter`](../assets/templates/voxel-world-starter/) | `bun install && bun run typecheck` |

Example copy:

```bash
cp -R .agents/skills/using-easeljs/assets/templates/vite-vanilla-ts ./my-easel-app
cd ./my-easel-app
bun install
bun run typecheck
```

The Deno template intentionally omits a lockfile; the copied project creates its
own on first cache/check. Package-manager checks do not prove Canvas2D output,
so run the result in a browser.

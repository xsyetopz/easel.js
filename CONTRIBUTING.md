# Contributing to EASEL.js

EASEL.js requires [Bun](https://bun.sh/) and Node.js 22 or later.

## Setup

```sh
git clone https://github.com/xsyetopz/easel.js.git
cd easel.js
bun install
```

## Checks

Run the checks that cover your change. For broad changes, run the full gate:

```sh
bun run release:check
```

Useful focused commands:

```sh
bun test
bun run typecheck
bun run typecheck:tests
bun run typecheck:website
bun run biome:check
bun run www:build
```

Biome handles linting. Source uses tabs, double quotes, and TypeScript. Do not
add inline suppressions to bypass errors. Keep public APIs stable unless the
change explicitly updates that contract.

## Pull requests

Create a branch from `main` and keep the change focused. Update tests, examples,
and documentation when public behavior changes. In the pull request, state the
problem, the chosen fix, and the commands you ran.

EASEL.js is a CPU-only Canvas2D renderer. WebGL state, GPU buffers, shader
programs, PBR materials, shadow maps, and environment maps do not belong in its
rendering pipeline. See [AGENTS.md](AGENTS.md) for repository ownership and
renderer constraints.

## Releases

Releases run only through `.github/workflows/release.yml`. Do not publish npm or
JSR packages locally. After a release commit reaches `main`, an authorized
maintainer starts the workflow with:

```sh
bun run release -- X.Y.Z
```

The workflow publishes through GitHub OIDC, verifies registry provenance, then
creates the Git tag and GitHub release.

## Conduct and license

Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions use the
[MIT License](LICENSE).

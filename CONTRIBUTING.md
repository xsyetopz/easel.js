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

A human contributor must open and manage the pull request. Agents and automated
coding tools may prepare local changes and a draft description, but they must
not open, edit, review, approve, comment on, close, or merge the PR.

All contributions must follow this guide, `AGENTS.md`, the Code of Conduct,
project licensing, and repository security and release controls. Do not ask a
tool or another contributor to bypass these requirements.

EASEL.js is a CPU-only Canvas2D renderer. WebGL state, GPU buffers, shader
programs, PBR materials, shadow maps, and environment maps do not belong in its
rendering pipeline. See [AGENTS.md](AGENTS.md) for repository ownership and
renderer constraints.

## Three.js API parity

EASEL matches the three.js public API surface where it makes sense on a CPU
Canvas2D rasterizer, but does not blindly copy GPU-only concepts. When adding
three.js-parity methods or classes, follow these rules:

### Class naming

| three.js | EASEL | Reason |
| --- | --- | --- |
| `BufferGeometry` | `Geometry` | No GPU buffer; typed arrays |
| `BufferAttribute` | `Attribute` | No GPU buffer; typed array |
| `InterleavedBuffer` | `InterleavedData` | No GPU buffer; interleaved typed-array data |
| `InterleavedBufferAttribute` | `InterleavedAttribute` | No GPU buffer |
| `Object3D` | `Node` | Scene graph node, not "3D object" |
| `Clock` | `Timer` | ES6 naming |
| `MeshBasicMaterial` | `BasicMaterial` | Dropped `Mesh` prefix |

Drop the `Buffer` prefix and the `Mesh` material prefix — these refer to WebGL
buffer objects and shader-based material pipelines that EASEL does not have.

### What to add vs what to reject

| three.js field/method | EASEL? | Reason |
| --- | --- | --- |
| `needsUpdate` | ✅ Add | CPU cache invalidation — triggers geometry re-upload |
| `updateRange` (singular) | ✅ Add | CPU dirty-region tracking |
| `uuid`, `name`, `userData` | ✅ Add | Generic identifiers, no GPU dependency |
| `Scene.environment` | ✅ Add | Scene-graph data; loaders/exporters may set it even if renderer ignores it |
| `usage = 35044` (`gl.STATIC_DRAW`) | ❌ Reject | WebGL usage hint; no CPU meaning |
| `onUploadCallback` / `onUpload()` | ❌ Reject | GPU buffer upload callback |
| `updateRanges` / `addUpdateRange()` / `clearUpdateRanges()` | ❌ Reject | GPU partial buffer update tracking |
| `version` (on buffers) | ❌ Reject | GPU buffer revision counter |
| `setUsage()` | ❌ Reject | Sets GPU usage hint |
| PBR fields (`alphaTest`, `clearcoat`, `anisotropy`, `aoMap`, `bumpMap`) | ❌ Reject | GPU shader inputs; CPU renderer uses baked lighting |

### API style

- **Use accessors, not `getFoo()`/`setFoo()` methods.** The modern API policy
  (`scripts/check-modern-api.ts`) rejects parameterless `getFoo()` methods and
  `setFoo(value)` when a `get foo()`/`set foo()` accessor exists.
  - ✅ `get hex(): number` — EASEL accessor
  - ❌ `getHex(): number` — three.js style, rejected by policy
- **No static class members.** Convert three.js static methods to exported
  standalone functions.
  - ✅ `export function findByName(clips, name)` — EASEL pattern
  - ❌ `static findByName(clips, name)` — three.js pattern, rejected by policy
- **Use `undefined`, not `null`, for absence.** The only exception is DOM API
  returns (e.g. `canvas.getContext("2d")` returns `CanvasRenderingContext2D |
  null`).
  - ✅ `renderTarget: unknown = undefined`
  - ❌ `renderTarget: unknown = null`

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

## Contribution requirements

- Search existing issues and pull requests before starting duplicate work.
- Discuss large, security-sensitive, or breaking changes with maintainers first.
- Keep each pull request focused on one clear change.
- Explain the problem, the approach, and any user-visible effect.
- Add or update tests when behavior changes.
- Run the relevant checks and report the actual results.
- Remove unrelated, generated, or temporary files.
- Respond to review with technical facts and revised code when needed.

The person submitting a change is responsible for the full change. They must
understand it, review it, and be able to explain it.

They must have the right to submit every part of the change, including code,
text, data, and images.

Do not include secrets, private data, copied material without permission, or
false test and review claims.

Report security problems through the repository's private security process when
one exists.

## Tool-assisted contributions

Tool use is allowed when the contribution meets the same quality, review,
license, security, and project-scope rules as other work.

Disclose meaningful coding-assistant or generated-content help in the pull
request. Include this Git trailer in the relevant commits:

```text
Assisted-by: Tool:Model
```

Use the real tool and model names when known. Do not put private prompts,
secrets, or personal data in the trailer.

Add one trailer for each assistant when needed.

Do not use `Co-authored-by` for a model.

The human contributor must review the complete change, run the checks, and take
responsibility for it.

Maintainers may close unreviewed bulk output, unrelated changes, false results,
or work that the contributor cannot explain.

Only a human contributor may add `Signed-off-by`. They may add it only when this
repository uses the unchanged Developer Certificate of Origin and they can make
that statement.

## Languages

Official language: English. Reviewed translations: none. Use this English file
if a translation differs.

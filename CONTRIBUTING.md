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

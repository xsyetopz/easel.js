# API comparison

`three-core.csv` compares EASEL's public API (`src/index.ts`) with three.js
core (`node_modules/three/src/Three.Core.js`, the version pinned in
`package.json`). It is generated; regenerate it with `bun run api:compare`
and check it with `bun run api:compare:check`.

Columns: `state`, `subject`, `kind`, `easel`, `three`. A `-` cell means the
side has no such export.

- `state`: `=` both; `<` EASEL-only; `>` THREE-only; `!` same name but
  different public shape.
- EASEL limits: CPU/Canvas2D; affine UV; baked flat/Gouraud;
  no GPU/shader/PBR/shadow/environment-map surface;
  limits do not describe THREE core.

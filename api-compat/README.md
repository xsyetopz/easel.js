# API compatibility manifests

This directory contains the permanent, source-grounded compatibility contract between
`@xsyetopz/easel` and `three`. The normalized manifests are generated with the
TypeScript compiler API from EASEL TypeScript and three.js JavaScript/JSDoc source.

- `schema/` contains the versioned JSON Schemas.
- `mappings/three.json` is the reviewed mapping and semantic-status source of truth.
- `generated/` is deterministic output from the locked local package versions.
- `snapshots/` is reserved for versioned release snapshots.

Run `bun scripts/api-compat/cli.ts generate` to generate manifests and reports, or
`bun scripts/api-compat/cli.ts check` to fail on stale output. `probe-latest` is an
explicit network operation and never runs as part of normal generation or checking.

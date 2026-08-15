# GitHub automation and templates

Scope: `.github/`. These files describe hosted behavior but do not grant permission to perform external actions; the root policy still applies.

## Ownership map
- `workflows/ci.yml` mirrors repository checks; `cloudflare-pages.yml` and `pages.yml` deploy `dist/www`; `release.yml` exclusively publishes npm/JSR and creates tags/releases.
- `ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`, and `dependabot.yml` own contribution intake and dependency update metadata.

## Change rules
- Preserve least-privilege permissions, bounded timeouts, concurrency controls, frozen installs, and release identity/version/provenance checks.
- Pin every external action `uses:` reference to a full 40-character commit SHA; CI's governance job enforces this.
- Do not add local publishing or bypass `release.yml`; release initiation remains an explicitly authorized maintainer action under `CONTRIBUTING.md`.
- Keep CI commands aligned with `package.json` rather than duplicating their implementation in shell.
- Parse changed YAML locally and run the package commands affected by workflow changes; use `bun run release:check` for broad gate changes.

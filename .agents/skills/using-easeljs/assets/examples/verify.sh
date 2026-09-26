#!/usr/bin/env sh
# Verifies the skill's runnable examples and starter templates in disposable
# copies outside the skill directory.
#
# usage: verify.sh [examples|api|templates|all] [EASEL_REPO]
#   examples   type-check every example with the repository's TypeScript
#              (@xsyetopz/easel resolved to EASEL_REPO/src/index.ts through
#              tsconfig paths), then run each oracle under Bun with a stub
#              Canvas2D host
#   api        run scripts/test_easel_api.ts against EASEL_REPO
#   templates  install each starter template from the registries into a
#              temporary copy, type-check it, build it, smoke-run entries
#              that a stub DOM can run, and re-run the examples against the
#              published package (drift check); SKIP when offline
#   all        every mode (default)
# EASEL_REPO defaults to the repository that contains this skill.
# Exit status: 0 all checks passed or skipped, 1 a check failed, 2 bad usage
# or missing core tool.
set -eu

HERE=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
SKILL=$(CDPATH='' cd -- "$HERE/../.." && pwd)
MODE=${1:-all}
REPO=${2:-$(CDPATH='' cd -- "$SKILL/../../.." && pwd)}

case "$MODE" in
  examples | api | templates | all) ;;
  *)
    echo 'usage: verify.sh [examples|api|templates|all] [EASEL_REPO]' >&2
    exit 2
    ;;
esac
if [ ! -f "$REPO/src/index.ts" ]; then
  echo "error: $REPO/src/index.ts not found; pass EASEL_REPO" >&2
  exit 2
fi
if ! command -v bun >/dev/null 2>&1; then
  echo 'error: bun not found' >&2
  exit 2
fi

WORK_ROOT=${TMPDIR:-/tmp}
WORK=$(mktemp -d "${WORK_ROOT%/}/easel-skill-verify.XXXXXX")
trap 'rm -rf "$WORK"' 0 INT TERM

TSC="$REPO/node_modules/.bin/tsc"
if [ ! -x "$TSC" ]; then
  echo "error: $TSC not found; run bun install in $REPO" >&2
  exit 2
fi

verify_examples() {
  dir="$WORK/examples"
  mkdir -p "$dir"
  cp "$HERE"/*.ts "$dir/"
  cat >"$dir/tsconfig.json" <<EOF
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": { "@xsyetopz/easel": ["$REPO/src/index.ts"] },
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022",
    "types": []
  },
  "files": ["$REPO/src/globals.d.ts"],
  "include": ["*.ts"]
}
EOF
  echo "tsc: $("$TSC" --version)"
  (cd "$REPO" && "$TSC" -p "$dir/tsconfig.json")
  echo 'PASS examples typecheck'
  echo "bun: $(bun --version)"
  (cd "$dir" && bun run.ts)
}

verify_api() {
  bun "$SKILL/scripts/test_easel_api.ts" --root "$REPO"
}

# Runs a template step and records PASS or FAIL without stopping the rest.
FAILED=0
step() {
  label=$1
  shift
  if "$@" >"$WORK/step.log" 2>&1; then
    echo "PASS $label"
  else
    echo "FAIL $label"
    tail -n 30 "$WORK/step.log"
    FAILED=1
  fi
}

node_template() {
  name=$1
  entry=$2
  dir="$WORK/templates/$name"
  mkdir -p "$WORK/templates"
  cp -R "$SKILL/assets/templates/$name" "$dir"
  step "$name install" sh -c "cd '$dir' && bun install --silent"
  step "$name typecheck" sh -c "cd '$dir' && bun run typecheck"
  step "$name build" sh -c "cd '$dir' && bun run build"
  if [ -n "$entry" ]; then
    step "$name smoke $entry" bun "$SKILL/scripts/smoke_entry.ts" "$dir/$entry"
  fi
}

verify_templates() {
  if ! bun pm view @xsyetopz/easel@0.7.0 version >/dev/null 2>&1 &&
    ! npm view @xsyetopz/easel@0.7.0 version >/dev/null 2>&1; then
    echo 'SKIP templates: npm registry unreachable'
    return 0
  fi
  node_template vite-vanilla-ts src/main.ts
  node_template voxel-world-starter src/main.ts
  node_template react-canvas ""
  node_template astro-canvas src/scene.ts

  # Drift check: the examples against the published 0.7.0 package.
  drift="$WORK/templates/vite-vanilla-ts/drift"
  mkdir -p "$drift"
  cp "$HERE"/*.ts "$drift/"
  sed -e '/"paths"/d' -e '/"files"/d' "$WORK/examples/tsconfig.json" \
    >"$drift/tsconfig.json" 2>/dev/null || {
    echo 'SKIP drift: run the examples mode first'
    drift=""
  }
  if [ -n "$drift" ]; then
    pkg="$WORK/templates/vite-vanilla-ts/node_modules/@xsyetopz/easel"
    step "published 0.7.0 examples typecheck" \
      sh -c "cd '$drift' && '$TSC' -p tsconfig.json"
    step "published 0.7.0 examples run" sh -c "cd '$drift' && bun run.ts"
    step "published 0.7.0 exports cross-check" \
      bun "$SKILL/scripts/easel_api.ts" exports --root "$pkg"
  fi

  if command -v deno >/dev/null 2>&1; then
    DENO=deno
  elif bunx deno --version >/dev/null 2>&1; then
    DENO="bunx deno"
  else
    DENO=""
  fi
  if [ -z "$DENO" ]; then
    echo 'SKIP deno-browser: deno not found (tried deno and bunx deno)'
  else
    dir="$WORK/templates/deno-browser"
    cp -R "$SKILL/assets/templates/deno-browser" "$dir"
    step "deno-browser check" sh -c "cd '$dir' && $DENO task check"
    step "deno-browser build" sh -c "cd '$dir' && $DENO task build"
    step "deno-browser smoke dist/main.js" \
      bun "$SKILL/scripts/smoke_entry.ts" "$dir/dist/main.js"
  fi
  return "$FAILED"
}

case "$MODE" in
  examples) verify_examples ;;
  api) verify_api ;;
  templates)
    verify_examples >/dev/null
    verify_templates
    ;;
  all)
    verify_examples
    verify_api
    verify_templates
    ;;
esac

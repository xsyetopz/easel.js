#!/usr/bin/env sh
# Verifies the threejs-to-easeljs examples in a disposable copy.
#
# Usage: verify.sh [all|typecheck|naive|run]
#   typecheck  tsc over every baseline, candidate, silent and check file
#   naive      tsc over every naive.ts; each "// expect TSnnnn" must match
#   run        bun runs every check.ts oracle (three.js vs EASEL)
#
# "three" resolves to $EASEL_REPO/node_modules/three/src/Three.js,
# "three/addons/*" to $EASEL_REPO/node_modules/three/examples/jsm/*, and
# "@xsyetopz/easel" to $EASEL_REPO/src/index.ts. EASEL_REPO defaults to the
# repository that contains this skill. Nothing is written inside the skill.
#
# Exit status: 0 all checks passed, 1 a check failed, 2 bad usage or a
# missing repository, bun, or three.js installation.
set -eu

HERE=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)
ROOT=${EASEL_REPO:-$(CDPATH='' cd -- "$HERE/../../../../.." && pwd -P)}
MODE=${1:-all}

case "$MODE" in
  all | typecheck | naive | run) ;;
  *)
    echo 'usage: verify.sh [all|typecheck|naive|run]' >&2
    exit 2
    ;;
esac

if ! command -v bun >/dev/null 2>&1; then
  echo 'error: bun not found' >&2
  exit 2
fi
if [ ! -f "$ROOT/src/index.ts" ]; then
  echo "error: $ROOT/src/index.ts not found; set EASEL_REPO" >&2
  exit 2
fi
if [ ! -f "$ROOT/node_modules/three/src/Three.js" ]; then
  echo "error: three.js not installed under $ROOT; run bun install" >&2
  exit 2
fi

WORK=$(mktemp -d "${TMPDIR:-/tmp}/threejs-to-easeljs.XXXXXX")
trap 'rm -rf "$WORK"' 0 INT TERM
WORK=$(CDPATH='' cd -- "$WORK" && pwd -P)
cp -R "$HERE/." "$WORK/"
rm -f "$WORK/verify.sh"

write_tsconfig() {
  # $1 output file, $2 "include" or "files" JSON array body
  cat >"$1" <<EOF
{
  "extends": "$ROOT/tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "declaration": false,
    "declarationMap": false,
    "noEmit": true,
    "allowJs": true,
    "checkJs": false,
    "maxNodeModuleJsDepth": 20,
    "typeRoots": ["$ROOT/node_modules/@types", "$ROOT/node_modules"],
    "types": ["bun-types"],
    "paths": {
      "@/*": ["$ROOT/src/*"],
      "three": ["$ROOT/node_modules/three/src/Three.js"],
      "three/addons/*": ["$ROOT/node_modules/three/examples/jsm/*"],
      "@xsyetopz/easel": ["$ROOT/src/index.ts"]
    }
  },
  $2
}
EOF
}

write_tsconfig "$WORK/tsconfig.json" \
  "\"include\": [\"**/*.ts\", \"$ROOT/src/globals.d.ts\"],
  \"exclude\": [\"**/naive.ts\"]"

NAIVE_FILES=$(find "$WORK" -name naive.ts | sort)
NAIVE_JSON=$(printf '%s\n' "$NAIVE_FILES" | sed 's/.*/"&"/' | paste -sd, -)
write_tsconfig "$WORK/tsconfig.naive.json" \
  "\"files\": [$NAIVE_JSON, \"$ROOT/src/globals.d.ts\"]"

STATUS=0
TSC_VERSION=$(CDPATH='' cd -- "$ROOT" && bunx tsc --version)
echo "toolchain: $TSC_VERSION; bun $(bun --version);" \
  "three $(sed -n 's/.*"version": "\(.*\)".*/\1/p' \
    "$ROOT/node_modules/three/package.json" | head -n 1)"

if [ "$MODE" = all ] || [ "$MODE" = typecheck ]; then
  if (CDPATH='' cd -- "$ROOT" &&
    bunx tsc -p "$WORK/tsconfig.json" --pretty false); then
    echo 'PASS typecheck: baselines, candidates, silent ports, oracles'
  else
    echo 'FAIL typecheck'
    STATUS=1
  fi
fi

if [ "$MODE" = all ] || [ "$MODE" = naive ]; then
  # tsc is expected to exit non-zero here; expect-errors.ts decides.
  TSC_EXIT=0
  (CDPATH='' cd -- "$ROOT" &&
    bunx tsc -p "$WORK/tsconfig.naive.json" --pretty false) \
    >"$WORK/naive.out" 2>&1 || TSC_EXIT=$?
  echo "naive tsc exit: $TSC_EXIT"
  # shellcheck disable=SC2086 # NAIVE_FILES holds paths without spaces
  if ! bun "$WORK/_lib/expect-errors.ts" "$WORK/naive.out" "$ROOT" \
    $NAIVE_FILES; then
    STATUS=1
  fi
fi

if [ "$MODE" = all ] || [ "$MODE" = run ]; then
  for dir in "$WORK"/*/; do
    name=$(basename "$dir")
    [ "$name" = _lib ] && continue
    if [ -f "$dir/check.ts" ]; then
      if (CDPATH='' cd -- "$WORK" && bun run "$dir/check.ts"); then
        echo "EXECUTED $name"
      else
        echo "FAIL run $name"
        STATUS=1
      fi
    else
      echo "COMPILED $name: no headless oracle"
    fi
  done
fi

exit "$STATUS"

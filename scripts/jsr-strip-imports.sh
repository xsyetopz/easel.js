#!/bin/bash
# Strips JSDoc import() type references from .js source files before JSR publish.
# Workaround for Deno deno_ast duplicate text change panic.
# The .d.ts files carry the real types — this only affects the .js copies.
set -euo pipefail

for f in $(find src -name '*.js' ! -name '*.test.js'); do
  sed -i.bak "s/import('[^']*')\.[A-Za-z_$][A-Za-z0-9_$]*/*/g" "$f"
  rm -f "$f.bak"
done

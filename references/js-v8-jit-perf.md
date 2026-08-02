# JS/TS Performance on V8 (Chrome/Node) — Notes for Easel.js

This complements `references/js-softrast-optguide.md`. That doc is
rasterizer-specific + contains Easel-measured findings; this one captures
**engine-level** V8/JIT patterns that tend to matter for CPU-heavy pipelines
(like a software renderer).

## Applies to Easel.js because…

Easel.js is dominated by:

- Long-lived hot loops over numeric data (projection, shading, rasterization,
  sorting).
- Repeated per-frame traversal over many similarly-shaped objects (scene graph +
  draw calls).
- A strict frame budget where one deopt or a single long task shows up as
  dropped frames/jank.

## V8’s optimization model (what matters)

V8 runs code first via Ignition (bytecode interpreter), then promotes “hot” code
paths to TurboFan (optimizing compiler). If a hot path becomes unpredictable
(types/shapes/branches), V8 either can’t optimize it well, or it deoptimizes and
falls back to slower paths.

## Hot-path rules that usually pay off

### 1) Keep types stable (especially in hot loops)

- Avoid code where the same variable/property can become “sometimes int-ish,
  sometimes float-ish, sometimes not-a-number”.
- Keep return types consistent (don’t return numbers in one branch and
  strings/objects in another).

Practical Easel mapping:

- Prefer “validate once, then run hot”:
  - Parse/normalize inputs at loader/setup boundaries.
  - Keep render-time loops free of defensive fallbacks.

### 2) Avoid type uncertainty / “defensive fallback” operators in hot loops

Patterns like `arr[i] || 0` (or `value ?? 0`) add branches and can force V8 to
keep extra type checks around. If you _know_ the data is numeric, make it
numeric earlier and don’t re-check per iteration.

Practical Easel mapping:

- Remove provably-dead fallbacks in typed array reads (matches the measured
  `?? 0` finding in `references/js-softrast-optguide.md`).

### 3) Keep call sites monomorphic (consistent object shapes / hidden classes)

V8 optimizes property access best when a function sees the _same_ object shape
repeatedly. Code becomes slower when call sites become polymorphic/megamorphic
(many shapes).

Practical Easel mapping:

- Avoid “sometimes add this property later” objects.
- Avoid mixing multiple ad-hoc object literals for the same conceptual type when
  they don’t share the same keys/order.
- If you need optional fields, prefer explicit defaults on construction.

### 4) Prefer dense arrays / TypedArrays for numeric bulk data

- Avoid sparse arrays (holes / huge index jumps) in performance-critical data.
- Prefer TypedArrays for large numeric datasets: predictable element types and
  layout.

Practical Easel mapping:

- Geometry/triangle buffers are already SoA-style TypedArrays; keep it that way.
- Be cautious when converting typed data into JS arrays “just for convenience”
  in hot paths.

### 5) Don’t turn 1 loop into 3 loops (and 2 allocations)

Chaining `map/filter/reduce` (and friends) often:

- allocates intermediate arrays,
- does multiple full passes over data,
- adds call overhead per element.

Practical Easel mapping:

- In traversal/sort/build loops, prefer a single `for` loop that does the full
  transformation.

### 6) Avoid indirection in hot loops

Typical indirection traps:

- `Proxy` (hard for engines to optimize reliably)
- deep property chains in tight loops (often cheap, but easy to accidentally
  make megamorphic)
- dynamic dispatch via strings (string comparisons everywhere)

Practical Easel mapping:

- If a per-triangle/per-pixel path depends on a material “mode”, prefer a small
  numeric enum/bitfield chosen once per draw call, then use it in the hot loop.

### 7) Cache repeated property accesses _when it reduces work_

Caching `const len = arr.length` can reduce repeated property reads and can hint
at loop invariants. It’s not a universal win (engines are smart), but it’s a
reasonable pattern when the loop is hot and the property is read every
iteration.

Practical Easel mapping:

- Use this only in the hottest loops (triangle/pixel loops), and only when
  profiling shows benefit.

## Easel.js “watch list” (code-shape + JIT risks)

These are not guaranteed problems; they’re high-ROI places to benchmark for
deopts/regressions:

- `src/pipeline/TriangleBuffer.ts` + `src/pipeline/sorting/PolygonSorter.ts`:
  triangle iteration order is intentionally identity (depth buffer handles
  correctness). Any re-introduction of per-triangle sorting should be
  benchmarked carefully (JS comparator callbacks can be expensive).
- `src/pipeline/SceneTraversal.ts`: heavy dispatch by `node.type` / `light.type`
  string checks. If traversal becomes a top hotspot, consider numeric tags
  and/or fewer string comparisons (bench first).
- `src/pipeline/sorting/DrawPrioritySorter.ts` and
  `src/pipeline/PainterSort.ts`: repeated optional chaining/defaulting in sort
  loops. If these become hot, hoist defaults earlier (e.g., guarantee
  `material.opacity`/`material.layer` defaults on material construction).
- `src/core/Node.ts`: `updateMatrixWorld` dominates deep-hierarchy scenes; avoid
  extra passes over children and avoid per-frame recomposition when
  `position/quaternion/scale` haven’t changed (benchmark using
  `www/examples/performance/scene-hierarchy.js` and compare
  `timings.traversalMs`).
- `src/pipeline/SceneTraversal.ts` + `src/pipeline/InstancedMeshBuilder.ts`:
  per-frame object churn (e.g. `new DrawCall()` / per-instance material objects)
  can show up as GC spikes; prefer caching and reusing objects in hot traversal
  paths.

## How to benchmark correctly (minimum)

- Warm up: run the path a few times before timing.
- Use realistic scene sizes (mesh count, tri count, overdraw).
- Track variance: run multiple samples and compare medians.
- Prefer end-to-end frame timings over microbenching tiny helpers.

## Optional tooling for deeper investigation

- Node/V8:
  - `node --trace-opt`
  - `node --trace-deopt`
  - `node --prof` + `--prof-process`

## Sources

- <https://techinsights.manisuec.com/javascript/v8-jit-compiler-optimization-techniques/>
- <https://developer.mozilla.org/en-US/docs/Web/Performance>
- <https://developer.mozilla.org/en-US/docs/Web/API/Performance_API>
- <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/JavaScript>
- <https://codezup.com/nodejs-performance-optimization-techniques/>
- `references/sources/codezup-nodejs-performance-optimization-techniques.summary.md`
- <https://romgrk.com/posts/optimizing-javascript/>

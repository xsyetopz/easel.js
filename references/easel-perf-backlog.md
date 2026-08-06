# EASEL.js Performance Backlog

This backlog is derived from:

- `references/js-softrast-optguide.md` (EASEL-measured rasterizer findings)
- `references/js-v8-jit-perf.md` (V8/JIT code-shape guidance)
- `references/web-perf-measurement-scheduling.md` (browser measurement +
  scheduling)

Rules:

- Every item needs a benchmark scenario + acceptance criteria before merging.
- Prefer changes that reduce work or remove dead checks over "micro-tricks" that
  change code shape.

## P0 (high confidence / high ROI)

### P0 - Cut matrix propagation overhead in `Node.updateMatrixWorld`

- Stage: transforms / traversal
- Why: `updateMatrixWorld(updateChildren=true)` used to iterate children twice
  per updated node (mark-dirty loop + recursion loop). This amplifies cost in
  deep hierarchies and large flat scenes.
- Where: `src/core/Node.ts` (`updateMatrixWorld`)
- Status: implemented (needs benchmark confirmation)
- Proposed change:
  - Add an internal `force` flag passed down recursion, and when
    `updateChildren=true` skip the explicit "mark all children dirty" pass.
  - Skip `updateMatrix()` / `Matrix4.compose()` when `position/quaternion/scale`
    haven’t changed (cache last composed scalars on the Node).
- How to validate:
  - `benchmarks/render-suite.mjs` at high depth/branches.
  - `benchmarks/render-suite.mjs` at high mesh counts.
  - Compare `timings.traversalMs` (and `timings.totalMs`) before/after.

### P0 - Add stage timing to the benchmark suite (DONE)

- Stage: measurement/observability
- Why: Without stable measurements, perf work is mostly guesswork and
  regressions are hard to catch.
- Where: `benchmarks/render-suite.mjs`
- Proposed change:
  - Add `performance.mark/measure` for traversal/sort/shade/raster/upload.
  - Add a small on-screen HUD or console aggregation (p50/p95) behind a flag.
- How to validate:
  - Confirm measures appear in Chrome DevTools Performance timeline.
  - Confirm overhead is negligible (measure disabled by default, or aggregated
    cheaply).

### P0 - De-risk `TriangleBuffer` sorting comparator code-shape (NO LONGER APPLIES)

- Stage: polygon sort (per draw call triangle buffer)
- Status: EASEL no longer z-sorts triangles within a draw call; `PolygonSorter`
  only builds an identity order and the depth buffer handles correctness.
- Where:
  - `src/pipeline/sorting/PolygonSorter.ts`
  - `src/pipeline/TriangleBuffer.ts`

## P1 (needs profiling confirmation)

### P1 - Remove per-frame DrawCall/material allocations in traversal

- Stage: traversal / scene build
- Why: `new DrawCall()` per visible mesh/instance per frame adds allocation + GC
  pressure (especially in high-culling workloads and large scenes).
- Where:
  - `src/pipeline/SceneTraversal.ts` (cache `DrawCall` on node)
  - `src/pipeline/InstancedMeshBuilder.ts` (cache per-instance `DrawCall` +
    per-instance material/color objects)
- How to validate:
  - `benchmarks/render-suite.mjs` at high totals (watch
    `traversalMs` + GC in DevTools).

### P1 - Reduce string comparisons in traversal if it becomes a hotspot

- Stage: scene traversal / light collection
- Why: repeated `node.type` / `light.type` string checks can be expensive if
  traversal dominates frame time; also encourages megamorphic branching.
- Where: `src/pipeline/SceneTraversal.ts` (`node.type === "Mesh"`,
  `endsWith("Light")`, `#collectLight`’s `if (light.type === "...")`)
- Proposed change:
  - Introduce stable numeric tags (enums) on node/light construction and switch
    on numbers in traversal.
  - Keep public API (`type` strings) for compatibility; tags are internal.
- How to validate:
  - Profile a deep hierarchy + many lights workload in
    `benchmarks/render-suite.mjs`.
  - Accept only if traversal stage time drops measurably without regressions.

### P1 - Hoist defaulting out of hot loops by enforcing invariants at construction time

- Stage: sorting + shading + rasterizer dispatch
- Why: optional chaining and nullish coalescing are fine in cold code, but in
  repeated loops they add checks/branches. If invariants hold, enforce them once
  and remove defensive checks from hot paths.
- Where:
  - `src/pipeline/PainterSort.ts` (`dc.material?.opacity ?? 0`,
    `material?.layer ?? 0`)
  - `src/pipeline/shading/LightBaker.ts` (`drawCall.material?.type`)
  - `src/pipeline/sorting/DrawPrioritySorter.ts` (`a.material?.layer ?? 0`)
- Proposed change:
  - Ensure `DrawCall.material` is never nullable at runtime paths (it already
    exists today).
  - Ensure `Material.opacity` and `Material.layer` always exist with defaults.
  - Replace `?.`/`??` in hot loops with direct access.
- How to validate:
  - Stage timings on large scenes (mesh count stress).
  - Also run typecheck/tests to ensure no undefined accesses were previously
    relied upon.

### P2 - Point rendering Math.sqrt precomputation

- Stage: point rendering in Rasterizer
- Where:
  - `src/pipeline/rasterizer/Rasterizer.ts` lines 1515, 1563
  - `src/pipeline/rasterizer/PointRasterizer.ts` line 18
- Change:
  - Precompute `Math.sqrt` for point radius once, not per scanline
  - Add `if (radius > 1)` guard to avoid computation when not needed
- Status: implemented, tests passing
- Notes:
  - Black magic profiler showed no clear speedup (inconclusive results)
  - Change made for edge case handling and code clarity
  - Draw load macrobenchmark shows 5M triangles/sec with 2.04µs per triangle
  - Geometry preparation dominates rasterizer cost

## P3 (minor improvements, low ROI)

### P3 - Math helper lookup caching

- Stage: overall frame time (allocation + cache behavior)
- Why: large object graphs and scattered memory can amplify cache misses;
  performance tends to track data locality.
- Where: `src/pipeline/DrawCall.ts` (many fields, nested objects like
  `centroid`)
- Proposed change:
  - Convert frequently-read per-draw-call scalars into SoA typed arrays in
    `DrawList` (or a dedicated buffer), keeping `DrawCall` as a small handle.
  - Keep public API stable; this is internal pipeline structure.
- How to validate:
  - Profiling + stage timings; accept only if it improves real workloads (not
    microbench).

## Sources

- <https://techinsights.manisuec.com/javascript/v8-jit-compiler-optimization-techniques/>
- <https://developer.mozilla.org/en-US/docs/Web/Performance>
- <https://developer.mozilla.org/en-US/docs/Web/API/Performance_API>
- <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/JavaScript>
- <https://codezup.com/nodejs-performance-optimization-techniques/>
- `references/sources/codezup-nodejs-performance-optimization-techniques.summary.md`
- <https://romgrk.com/posts/optimizing-javascript/>

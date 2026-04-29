# JS Canvas2D Software Rasterizer — Optimization Reference

> Target audience: AI coding agent implementing a software rasterizer in JS/TS using `ImageData` + `putImageData`.
> Aesthetic: retro/pixelated. Affine mapping, no AA, dithered textures, 128x128 tex, vertex jitter acceptable.
> Depth: hybrid Z-buffer + painter's algorithm.
> Goal: maximum throughput, zero visual-polish overhead.

## Related docs

- [`references/js-v8-jit-perf.md`](./js-v8-jit-perf.md) — V8/JIT code-shape rules + Easel mapping
- [`references/web-perf-measurement-scheduling.md`](./web-perf-measurement-scheduling.md) — browser measurement, stage timing, scheduling to avoid jank
- [`references/easel-perf-backlog.md`](./easel-perf-backlog.md) — prioritized perf work items tied to current code patterns

---

## Fundamentals

Buffer setup (once, reuse every frame):

```ts
const imgData = ctx.createImageData(W, H);
const buf = new Uint32Array(imgData.data.buffer);
const zbuf = new Uint32Array(W * H); // integer Z, not float
```

Pixel color packing (little-endian ABGR):

```ts
const color = 0xFF000000 | (b << 16) | (g << 8) | r;
```

Frame loop:

```ts
buf.fill(clearColor);
zbuf.fill(0xFFFFFF);
// ...rasterize...
ctx.putImageData(imgData, 0, 0);
```

---

## Triangle Rasterization — Edge Function Method

No vertex sorting. No flat-top/flat-bottom split. Barycentric weights come free.

```ts
function fillTri(
  buf: Uint32Array, zbuf: Uint32Array, W: number, H: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  color: number, testZ: boolean, writeZ: boolean
) {
  const minX = Math.max(0, (Math.min(ax, bx, cx) + 0.5) | 0);
  const maxX = Math.min(W - 1, (Math.max(ax, bx, cx) + 0.5) | 0);
  const minY = Math.max(0, (Math.min(ay, by, cy) + 0.5) | 0);
  const maxY = Math.min(H - 1, (Math.max(ay, by, cy) + 0.5) | 0);
  if (minX > maxX || minY > maxY) return;

  const dx01 = bx - ax, dy01 = by - ay;
  const dx12 = cx - bx, dy12 = cy - by;
  const dx20 = ax - cx, dy20 = ay - cy;

  const area = dx01 * dy20 - dy01 * dx20;
  if (area >= 0) return; // backface cull (CW winding)

  // Incremental Z setup
  const invA = 1 / area;
  const zDx = (dy01 * az + dy12 * bz + dy20 * cz) * invA;
  const zDy = -(dx01 * az + dx12 * bz + dx20 * cz) * invA;

  let row0 = (minX - ax) * dy01 - (minY - ay) * dx01;
  let row1 = (minX - bx) * dy12 - (minY - by) * dx12;
  let row2 = (minX - cx) * dy20 - (minY - cy) * dx20;
  let zRow = (row0 * az + row1 * bz + row2 * cz) * invA;

  for (let y = minY; y <= maxY; y++) {
    let e0 = row0, e1 = row1, e2 = row2;
    let z = zRow;
    const yOff = y * W;
    for (let x = minX; x <= maxX; x++) {
      if (e0 <= 0 && e1 <= 0 && e2 <= 0) {
        const idx = yOff + x;
        const zi = (z * 0xFFFFFF) | 0;
        if (!testZ || zi < zbuf[idx]) {
          buf[idx] = color;
          if (writeZ) zbuf[idx] = zi;
        }
      }
      e0 += dy01; e1 += dy12; e2 += dy20;
      z += zDx;
    }
    row0 -= dx01; row1 -= dx12; row2 -= dx20;
    zRow += zDy;
  }
}
```

### Affine UV Interpolation

Same incremental pattern. No perspective divide.

```ts
// Setup (per triangle, after area/invA computed)
const uDx = (dy01 * u0 + dy12 * u1 + dy20 * u2) * invA;
const uDy = -(dx01 * u0 + dx12 * u1 + dx20 * u2) * invA;
const vDx = (dy01 * v0 + dy12 * v1 + dy20 * v2) * invA;
const vDy = -(dx01 * v0 + dx12 * v1 + dx20 * v2) * invA;
let uRow = (row0 * u0 + row1 * u1 + row2 * u2) * invA;
let vRow = (row0 * v0 + row1 * v1 + row2 * v2) * invA;

// Inner loop: u += uDx; v += vDx;
// Per scanline: uRow += uDy; vRow += vDy;
// Texel fetch: tex[((v & 0x7F) << 7) | (u & 0x7F)] for 128x128
```

---

## Depth Modes

```ts
const enum DepthMode {
  NONE,       // skybox, UI overlay: always write color, skip Z
  TEST_WRITE, // opaque geometry: test + write Z
  TEST_ONLY,  // decals, coplanar: test Z, don't write
  ALWAYS,     // painter's pre-sorted: write color + Z, no test
}
```

Hoist `testZ`/`writeZ` bools from mode before loops. V8 treats as constant after warmup.

---

## Optimization Techniques

### Memory / Allocation

| Technique               | Detail                                                          |
| ----------------------- | --------------------------------------------------------------- |
| `Uint32Array` color buf | 1 write/pixel vs 4                                              |
| `Uint32Array` Z buf     | integer compare; map Z→0–0xFFFFFF after projection              |
| Pre-allocate all pools  | typed arrays, fixed size, zero `new`/`[]`/`{}` in render loop   |
| Reuse `ImageData`       | create once, `buf.fill()` + `putImageData` per frame            |
| Pack Z+stencil          | `(z << 8) \| stencil` in single `Uint32Array` if stencil needed |

### Inner Loop

| Technique            | Detail                                                  |
| -------------------- | ------------------------------------------------------- |
| Incremental edges    | 1 int add/edge/pixel, no multiply                       |
| Incremental Z        | 1 float add/pixel, not 3mul+2add                        |
| Incremental UV       | same — just adds. Affine = no per-pixel divide          |
| Hoist `yOff = y * W` | outside x loop                                          |
| `\| 0` truncation    | never `Math.round`/`Math.ceil`/`Math.floor` in hot path |
| Unroll 2x/4x         | halves/quarters loop overhead                           |

### Triangle Setup

| Technique                   | Detail                                                     |
| --------------------------- | ---------------------------------------------------------- |
| Backface cull in view space | before projection — kills ~50% tris in closed mesh         |
| Ternary min/max             | `a < b ? a : b` not `Math.min(a,b)` — no function call     |
| Early bbox reject           | `if (minX > maxX \|\| minY > maxY) return`                 |
| Compute all deltas once     | zDx, zDy, uDx, uDy, vDx, vDy — per triangle, not per pixel |

### Sorting / Overdraw

| Technique                    | Detail                                                              |
| ---------------------------- | ------------------------------------------------------------------- |
| Front-to-back opaques        | early Z reject skips color write + interpolation                    |
| Insertion sort on prev frame | O(n) for nearly-sorted; zero allocation                             |
| Hierarchical Z-buffer        | coarse 1/8 res `Uint32Array`; reject entire tris before rasterizing |
| Dirty-rect clear             | only `buf.fill()` tiles actually drawn into                         |

### Architecture

| Technique                     | Detail                                                      |
| ----------------------------- | ----------------------------------------------------------- |
| Tile binning (32x32 or 64x64) | tile color+Z fits L1 cache; trivial reject per tile         |
| Projected vertex cache        | don't re-transform shared verts in indexed meshes           |
| Guard band clipping           | only clip at near plane; bbox clamping handles screen edges |
| `OffscreenCanvas` + Worker    | rasterizer never competes with DOM/events                   |

### Worth Benchmarking

| Technique                                  | Detail                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Fixed-point 16.16 edges in inner loop only | float setup → convert → int stepping. `(e0 \| e1 \| e2) <= 0` single branch                        |
| WASM inner loop                            | hand-written WAT or compiled. Real i32, `memory.fill`, `v128` SIMD for 4px at once. 30–50% over JS |
| Screen-door dithering for alpha            | 4x4 Bayer threshold, 1 compare, no read-modify-write blend                                         |
| 2x2 quad processing                        | may help V8 auto-vectorize                                                                         |

---

## Span Fill (Flood Fill)

For paint-bucket operations on the `Uint32Array` buffer:

```ts
function spanFill(buf: Uint32Array, W: number, H: number, sx: number, sy: number, fill: number) {
  const target = buf[sy * W + sx];
  if (target === fill) return;
  const stack: number[] = [sx, sy]; // flat pairs, no object alloc

  while (stack.length) {
    let y = stack.pop()!, x = stack.pop()!;
    let off = y * W;
    while (x > 0 && buf[off + x - 1] === target) x--;
    let spanUp = false, spanDn = false;
    while (x < W && buf[off + x] === target) {
      buf[off + x] = fill;
      const up = y > 0 && buf[off - W + x] === target;
      const dn = y < H - 1 && buf[off + W + x] === target;
      if (up && !spanUp) { stack.push(x, y - 1); spanUp = true; }
      else if (!up) spanUp = false;
      if (dn && !spanDn) { stack.push(x, y + 1); spanDn = true; }
      else if (!dn) spanDn = false;
      x++;
    }
  }
}
```

---

## Fast Integer Divide-by-255

For alpha blending when needed:

```ts
// exact integer div by 255, no float
((value * 0x8081) >>> 23) & 0xFF
```

---

## Anti-Patterns — Do Not

- `Math.round`/`Math.ceil`/`Math.floor` in inner loops — use `| 0`
- Create `ImageData` per frame
- `Float32Array` Z-buffer — use `Uint32Array` with mapped integer Z
- Fixed-point for projection/transforms — overflow and singularity risk in JS
- Subpixel snapping — extra math for polish not wanted
- Perspective-correct UV — affine is the goal
- Anti-aliasing
- Per-pixel function calls — inline everything in hot path
- `new`/`[]`/`{}` in render loop — GC pause = dropped frame
- `Math.min(a,b,c)` in per-tri setup — use ternary chains
- Sort when unnecessary — if painter's pass already ordered by scene graph, skip

---

## V8-Specific Findings (Easel.js Benchmarking)

> Measured on Canvas2D rasterizer, ~600x400 canvas, typical laptop, Chrome/V8.
> These findings **override** generic advice above where they conflict.

### What the generic guide gets wrong for V8

| #   | Generic Advice                             | V8 Reality                                                                                                                                                                                                                                                                                                                                               | Measured Impact          |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Pool objects, zero `new` in render loop    | V8 young-gen GC handles short-lived objects in μs. A DrawCall pool with `reset()` was **50% slower** than `new DrawCall()` at 2000 meshes. Pool's field-by-field reset defeats hidden class optimization.                                                                                                                                                | -50% at 2000 meshes      |
| 2   | `\| 0` instead of `Math.floor` in hot path | V8 compiles `Math.floor` to a single CPU instruction. `texU - ((texU \| 0) - (texU < 0 ? 1 : 0))` adds a branch per pixel.                                                                                                                                                                                                                               | -20% in textured fill    |
| 3   | Inline everything in hot path              | Replacing `MathUtils.clamp()` with inline ternaries bloated ScanlineFill past V8's inlining threshold (~460 bytecodes). The **entire fill callback** deoptimized.                                                                                                                                                                                        | -20% in rasterizer       |
| 4   | Single sort pass with composite key        | Timsort is O(n) on nearly-sorted data. Two simple comparators on frame-coherent draw calls outperforms one pass with `(layer << 24) \| (0xFFFFFF - dist)` bit manipulation.                                                                                                                                                                              | -15% at 2000 draw calls  |
| 5   | Avoid `Map` in sort comparators            | `Map.get()` in comparators showed no measurable overhead at 2000 draw calls. V8 optimizes `Map` well.                                                                                                                                                                                                                                                    | 0% change                |
| 6   | —                                          | Removing `?? 0` on `Float32Array` reads is provably correct — values are never null/undefined. Eliminates dead type checks.                                                                                                                                                                                                                              | +8% on deep hierarchies  |
| 7   | Cache callbacks as class fields            | Private class fields holding closures that reference other private methods (`#cb = (...args) => this.#method(...args)`) change V8's hidden class layout for the entire class. All methods on the class deoptimize — even those unrelated to the callbacks. Move closures to inline creation at the call site, only when the code path is actually taken. | -48% on all workloads    |
| 8   | Pre-allocate per-frame batching structures | Per-frame `Map.set()` + string key construction (`geoId + ":" + matId`) for batch detection costs more than the saved DrawCall overhead. Merging vertices into one DrawCall doesn't reduce vertex projection cost — same vertex count, same matrix multiplies. Batching only helps when it eliminates draw calls entirely (e.g., InstancedMesh).         | -43% at 2000 meshes      |
| 9   | PoT bitmask UV wrap replaces `Math.floor`  | `((texU * texW) \| 0 + texW) & texWm1` replaces `Math.floor(texU)` fract + float-to-texel. Unlike finding #2 (bitwise fract with branch), this is branchless and avoids the float fract entirely. Two's complement handles negative UVs correctly: `(-5) & 127 = 123`.                                                                                   | +10% textured fill       |
| 10  | Skip LightBaker for unlit materials        | `BasicMaterial` and `PointsMaterial` don't respond to lights. Adding `if (type === "BasicMaterial") return` before the shade loop skips O(tris x lights) computation. The Rasterizer already has an unlit path (`#fillUnlitTex`, `#fillFlat`) that ignores shading data.                                                                                 | +27% unlit rendering     |
| 11  | Front-to-back opaque sort for early-Z      | Reverse opaque draw calls within each layer group so nearest objects render first. Depth buffer early-Z (`if (depth > buf[idx]) continue`) rejects occluded pixels. Works when objects have different XY tile distances. **No effect on Z-stacked planes** — XY Manhattan distance gives all planes distance 0, making the reversal a no-op.             | 0% overdraw, ~0% general |

### Key takeaway

V8's JIT is aggressive. "Optimization" that changes code shape (inlining, pooling, bit tricks, class field layout) often **breaks** V8's existing optimizations. The safe optimizations are: removing dead code (`?? 0` on typed arrays), skipping unnecessary work (LightBaker for unlit materials), and replacing multi-step math with single-step equivalents (PoT bitmask). Adding private fields — even unused ones — can deoptimize an entire class.

For broader V8/JIT guidance (beyond rasterizer-specific measurements), see [`references/js-v8-jit-perf.md`](./js-v8-jit-perf.md).

### Benchmark baselines (canvas ~600x400)

| Workload                     | 120fps Threshold              | Bottleneck Stage                     |
| ---------------------------- | ----------------------------- | ------------------------------------ |
| Mesh count                   | ~1000 meshes                  | Per-mesh: DrawCall + centroid + sort |
| Triangle density (Gouraud)   | ~65K tris                     | Rasterizer scanline fill             |
| Triangle density (Wireframe) | ~97K tris                     | WireframeRasterizer (Bresenham)      |
| Textured vs flat             | ~700 tex vs ~1000 flat meshes | UV sampling inner loop (+15%)        |
| Frustum culling              | ~1000 meshes                  | Frustum test + matrix per mesh       |
| Point cloud 50K              | Size 4px                      | PointRasterizer fill (pixels/point)  |
| Overdraw (opaque planes)     | 11 layers                     | Full-screen fill per layer           |
| Scene hierarchy              | ~2048 meshes (depth 10)       | Matrix propagation chain             |
| Voxel individual cubes       | ~256 cubes                    | Per-mesh overhead                    |

### Architectural improvements with measured justification

| Improvement                        | Impact | Evidence                                                                                                                                                |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **InstancedMesh pipeline support** | High   | 1352 individual cubes = 40fps (16K tris). Single merged mesh with 16K tris = 120fps. InstancedMesh eliminates per-mesh overhead without manual merging. |
| **Static mesh batching**           | High   | Combine meshes sharing geometry+material into one draw call. Reduces overhead from O(N meshes) to O(batches).                                           |
| **Power-of-2 texture masking**     | Medium | Textures capped at 128x128. `tx & 0x7F` for Repeat mode replaces `Math.floor` + float→int conversion.                                                   |
| **Point size fast paths**          | Medium | Fill is quadratic with size. Size 1–2: direct pixel write. Size >4: `Uint32Array.fill()` for scanline runs.                                             |
| **Overdraw**                       | None   | Fundamentally fill-rate limited. No algorithmic fix — scene design only.                                                                                |

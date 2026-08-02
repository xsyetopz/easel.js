# Web Performance (Browser) - Measurement + Scheduling for Easel.js

This is about **runtime smoothness** (frame time, jank, responsiveness), not
just "bundle size". It’s meant to guide profiling and regression prevention for
Easel.js’ Canvas2D software renderer and its React website.

## Applies to Easel.js because...

- Easel rendering is CPU-bound and commonly runs on the **main thread**
  (Canvas2D + scene updates).
- Any single "long task" can block input, animation, and painting, producing
  visible jank.
- The best optimizations are the ones you can measure and prevent from
  regressing.

## What to measure (minimum set)

- End-to-end frame time (ms/frame).
- Pipeline stage timings:
  - traversal, sort, shading, rasterization, upload (canvas write).
- "Long task" symptoms:
  - frames that exceed your budget (e.g. 16.7ms @ 60fps),
  - tasks that block the main thread long enough to feel unresponsive (often
    discussed as "long tasks" at 50ms+).

If you need more than manual stage timings, the Performance APIs include entry
types for long-running work (e.g. long tasks / long animation frames) that can
be consumed via `PerformanceObserver`.

## Instrumentation recipes (drop-in patterns)

### 1) Stage timing with `performance.mark()` / `performance.measure()`

```js
performance.mark("frame:start");
// traversal
performance.mark("trav:start");
traverse();
performance.mark("trav:end");
performance.measure("trav", "trav:start", "trav:end");

// raster
performance.mark("rast:start");
rasterize();
performance.mark("rast:end");
performance.measure("rast", "rast:start", "rast:end");

performance.mark("frame:end");
performance.measure("frame", "frame:start", "frame:end");
```

### 2) Consume measurements with `PerformanceObserver` (works in Workers too)

```js
const obs = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType !== "measure") continue;
    // aggregate entry.name + entry.duration
  }
});
obs.observe({ entryTypes: ["measure"] });
```

Keep the observer/aggregation lightweight; don’t add heavy logging inside the
hot loop.

## Scheduling patterns to avoid jank

### Keep work inside an animation loop, but don’t let it become one giant task

- `requestAnimationFrame()` is appropriate for driving render loops.
- If a single frame does too much work, you can split work across frames:
  - chunk big updates (e.g. building large scenes),
  - avoid doing "everything" on the same tick as user input.

### Yielding pattern (when you must split a long task)

MDN’s pattern for yielding to the main thread is effectively:

```js
function yieldToMain() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
```

Use it to break a big operation into smaller tasks, so the browser has more
chances to process input and paint between chunks.

### Move CPU work off the main thread when it competes with UI

If the website UI (React) and the renderer fight for the same main-thread
budget:

- move heavy computation to a Worker where feasible,
- consider `OffscreenCanvas` for texture preprocessing / pixel work (where
  supported),
- keep the main thread focused on orchestration + presenting the final frame.

## Regression prevention

- Decide a few performance budgets (e.g. `frame` p95 < 16.7ms at a chosen
  resolution/scene).
- Capture measurements in the performance timeline and compare across changes.
- Prefer "no regression" checks on representative workloads over microbench-only
  wins.

## Sources

- <https://developer.mozilla.org/en-US/docs/Web/Performance>
- <https://developer.mozilla.org/en-US/docs/Web/API/Performance_API>
- <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/JavaScript>
- <https://techinsights.manisuec.com/javascript/v8-jit-compiler-optimization-techniques/>
- <https://codezup.com/nodejs-performance-optimization-techniques/>
- <https://romgrk.com/posts/optimizing-javascript/>

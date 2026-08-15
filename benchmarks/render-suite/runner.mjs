import { performance } from "node:perf_hooks";
import process from "node:process";
export function runWorkload(workload, options) {
  const instance = workload.create();
  const totalFrames = options.warmup + options.samples * options.frames;
  let frame = 0;

  for (; frame < options.warmup; frame++) {
    runFrame(instance, frame, { profileTraversal: options.profileTraversal });
  }

  if (options.gcBetweenSamples) runGarbageCollector();

  const samples = [];
  const stageSamples = [];
  const memoryDeltaSamples = [];
  const memoryBefore = getMemoryUsage();

  for (let sample = 0; sample < options.samples; sample++) {
    if (options.gcBetweenSamples) runGarbageCollector();
    const stage = createStageAccumulator();
    const memorySampleBefore = getMemoryUsage();
    const start = performance.now();
    for (let i = 0; i < options.frames; i++, frame++) {
      const timings = { profileTraversal: options.profileTraversal };
      runFrame(instance, frame, timings);
      accumulateStage(stage, timings);
    }
    const elapsed = performance.now() - start;
    const memorySampleAfter = getMemoryUsage();
    samples.push(elapsed / options.frames);
    stageSamples.push(finalizeStageAccumulator(stage, options.frames));
    memoryDeltaSamples.push(
      diffMemoryUsage(memorySampleBefore, memorySampleAfter),
    );
  }

  const stageMs = summarizeStageSamples(stageSamples);
  return {
    name: workload.name,
    description: workload.description,
    metadata: instance.metadata,
    frames: totalFrames,
    warmupFrames: options.warmup,
    samples: options.samples,
    framesPerSample: options.frames,
    msPerFrame: summarize(samples),
    fps: summarize(samples.map((value) => 1000 / value)),
    stageMs,
    pipelineMs: stageMs,
    memoryBefore,
    memoryAfter: getMemoryUsage(),
    memoryDelta: summarizeMemoryDeltas(memoryDeltaSamples),
  };
}

export function runFrame(instance, frame, timings) {
  if (typeof instance.run === "function") {
    instance.run(frame, timings);
    return;
  }
  if (typeof instance.step === "function") instance.step(frame);
  instance.renderer.render(instance.scene, instance.camera, timings);
}

export function createStageAccumulator() {
  return {};
}

export function accumulateStage(accumulator, timings) {
  for (const [key, value] of Object.entries(timings)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    accumulator[key] = (accumulator[key] ?? 0) + value;
  }
}

export function finalizeStageAccumulator(accumulator, frames) {
  const result = {};
  for (const [key, value] of Object.entries(accumulator)) {
    result[key] = value / frames;
  }
  return result;
}

export function summarize(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const count = sorted.length;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / count;
  let variance = 0;
  for (const value of sorted) {
    const delta = value - mean;
    variance += delta * delta;
  }
  variance /= count;
  return {
    min: sorted[0],
    median: percentile(sorted, 0.5),
    mean,
    p95: percentile(sorted, 0.95),
    max: sorted[count - 1],
    stddev: Math.sqrt(variance),
  };
}

export function summarizeStageSamples(samples) {
  const keys = Object.keys(samples[0] ?? {});
  const result = {};
  for (const key of keys) {
    result[key] = summarize(samples.map((sample) => sample[key]));
  }
  return result;
}

export function diffMemoryUsage(before, after) {
  if (!(before && after)) return;
  const result = {};
  for (const [key, value] of Object.entries(after)) {
    const previous = before[key];
    if (typeof value === "number" && typeof previous === "number") {
      result[key] = value - previous;
    }
  }
  return result;
}

export function summarizeMemoryDeltas(samples) {
  const present = samples.filter(Boolean);
  const keys = Object.keys(present[0] ?? {});
  const result = {};
  for (const key of keys) {
    result[key] = summarize(present.map((sample) => sample[key]));
  }
  return result;
}

export function runGarbageCollector() {
  if (typeof globalThis.gc === "function") globalThis.gc();
}

export function percentile(sorted, percentileValue) {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function getMemoryUsage() {
  if (typeof process?.memoryUsage !== "function") return;
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  };
}

export function getRuntimeMetadata() {
  return {
    bun: globalThis.Bun?.version,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    versions: process.versions,
    cpu: process.env.EASEL_CPU_NAME || "unknown",
  };
}

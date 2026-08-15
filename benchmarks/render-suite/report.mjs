export function printReport(run) {
  console.log("# EASEL benchmark suite");
  console.log(`entry: ${run.entry}`);
  console.log(
    `runtime: node ${run.runtime.node}${run.runtime.bun ? `, bun ${run.runtime.bun}` : ""}, ${run.runtime.platform}/${run.runtime.arch}`,
  );
  console.log(
    `warmup: ${run.options.warmupFrames} frames, samples: ${run.options.samples}, frames/sample: ${run.options.framesPerSample}`,
  );
  for (const result of run.workloads) {
    console.log(`\n## ${result.name}`);
    console.log(result.description);
    console.log(`metadata: ${JSON.stringify(result.metadata)}`);
    console.log(
      `ms/frame median ${formatNumber(result.msPerFrame.median)} p95 ${formatNumber(result.msPerFrame.p95)} mean ${formatNumber(result.msPerFrame.mean)} stddev ${formatNumber(result.msPerFrame.stddev)}`,
    );
    console.log(
      `fps median ${formatNumber(result.fps.median)} p95 ${formatNumber(result.fps.p95)} mean ${formatNumber(result.fps.mean)}`,
    );
    printStageSummary(result);
    printMemorySummary(result);
  }
}

export function printStageSummary(result) {
  const pipeline = result.pipelineMs;
  if (pipeline?.clearMs && pipeline?.totalMs) {
    console.log(
      `pipeline median ms clear=${formatNumber(pipeline.clearMs.median)} traversal=${formatNumber(pipeline.traversalMs?.median)} fogCull=${formatNumber(pipeline.fogCullMs?.median)} sort=${formatNumber(pipeline.sortMs?.median)} shadeRaster=${formatNumber(pipeline.shadeRasterMs?.median)} upload=${formatNumber(pipeline.uploadMs?.median)} total=${formatNumber(pipeline.totalMs.median)}`,
    );
    return;
  }
  const entries = Object.entries(result.stageMs ?? {});
  if (entries.length === 0) return;
  console.log(
    `stage median ms ${entries
      .map(([key, value]) => `${key}=${formatNumber(value.median)}`)
      .join(" ")}`,
  );
}

export function printMemorySummary(result) {
  const heapUsed = result.memoryDelta?.heapUsed?.median;
  const arrayBuffers = result.memoryDelta?.arrayBuffers?.median;
  if (!(Number.isFinite(heapUsed) || Number.isFinite(arrayBuffers))) return;
  console.log(
    `memory delta bytes heapUsed=${formatNumber(heapUsed)} arrayBuffers=${formatNumber(arrayBuffers)}`,
  );
}

export function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(3) : "n/a";
}

export function printHelp() {
  console.log(`Usage: bun run benchmarks/render-suite.mjs [options]

Options:
  --entry=src|dist|path      Import source under Bun, dist under Node, or a custom module path.
  --workload=name|all        Run one workload or all workloads. Default: all.
  --warmup=N                 Warmup frames before measurement. Default: 60.
  --samples=N                Number of measured samples. Default: 40.
  --frames=N                 Frames per sample. Default: 5.
  --profile-traversal        Enable detailed SceneTraversal project/assemble timers.
  --gc                       Run garbage collection between samples when exposed by runtime.
  --json=path                Write full machine-readable results.
  --list                     Print workload names.
  --help                     Print this help.
`);
}

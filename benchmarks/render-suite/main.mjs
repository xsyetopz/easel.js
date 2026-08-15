#!/usr/bin/env bun

import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createWorkloads, loadEasel, parseArgs } from "./cli.mjs";
import { installImageDataPolyfill } from "./polyfills.mjs";
import { printHelp, printReport } from "./report.mjs";
import { getRuntimeMetadata, runWorkload } from "./runner.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
installImageDataPolyfill();
const options = parseArgs(process.argv.slice(2));

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

const easel = await loadEasel(options.entry);
const workloads = createWorkloads(easel);

if (process.argv.includes("--list")) {
  for (const workload of workloads) {
    console.log(`${workload.name}\t${workload.description}`);
  }
  process.exit(0);
}

const selectedWorkloads =
  options.workload === "all"
    ? workloads
    : workloads.filter((workload) => workload.name === options.workload);
if (selectedWorkloads.length === 0) {
  throw new Error(`Unknown workload '${options.workload}'. Run with --list.`);
}

const run = {
  tool: "easel-benchmark-suite",
  version: 2,
  entry: options.entry,
  runtime: getRuntimeMetadata(),
  options: {
    warmupFrames: options.warmup,
    samples: options.samples,
    framesPerSample: options.frames,
    profileTraversal: options.profileTraversal,
    gcBetweenSamples: options.gcBetweenSamples,
  },
  workloads: selectedWorkloads.map((workload) =>
    runWorkload(workload, options),
  ),
};

printReport(run);

if (process.argv.some((arg) => arg.startsWith("--json="))) {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const jsonPath = resolve(repoRoot, options.jsonPath);
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(run, null, 2)}\n`);
  console.log(`\njson: ${jsonPath}`);
}

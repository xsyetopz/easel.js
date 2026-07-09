#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));

if (options.help) {
	printHelp();
	process.exit(0);
}

if (!(options.baselinePath && options.currentPath)) {
	throw new Error("--baseline and --current are required. Run with --help.");
}

const baseline = readJson(options.baselinePath);
const current = readJson(options.currentPath);
const comparison = compareRuns(baseline, current, options);

printReport(comparison);

if (options.jsonPath) {
	const jsonPath = resolve(options.jsonPath);
	mkdirSync(dirname(jsonPath), { recursive: true });
	writeFileSync(jsonPath, `${JSON.stringify(comparison, null, 2)}\n`);
	console.log(`\njson: ${jsonPath}`);
}

if (options.failRegressionPct > 0 && comparison.regressions.length > 0) {
	process.exitCode = 1;
}

function parseArgs(args) {
	const parsed = {
		baselinePath: "",
		currentPath: "",
		jsonPath: "",
		medianThresholdPct: 3,
		p95ThresholdPct: 5,
		failRegressionPct: 0,
		help: false,
	};

	for (const arg of args) {
		if (arg === "--help" || arg === "-h") {
			parsed.help = true;
			continue;
		}
		const eq = arg.indexOf("=");
		const key = eq === -1 ? arg : arg.slice(0, eq);
		const value = eq === -1 ? "" : arg.slice(eq + 1);
		switch (key) {
			case "--baseline":
				parsed.baselinePath = value;
				break;
			case "--current":
				parsed.currentPath = value;
				break;
			case "--json":
				parsed.jsonPath = value;
				break;
			case "--median-threshold":
				parsed.medianThresholdPct = parseNonNegativeNumber(
					value,
					"median-threshold",
				);
				break;
			case "--p95-threshold":
				parsed.p95ThresholdPct = parseNonNegativeNumber(value, "p95-threshold");
				break;
			case "--fail-regression":
				parsed.failRegressionPct = parseNonNegativeNumber(
					value,
					"fail-regression",
				);
				break;
			default:
				throw new Error(`Unknown argument '${arg}'. Run with --help.`);
		}
	}

	return parsed;
}

function parseNonNegativeNumber(value, name) {
	const number = Number(value);
	if (!Number.isFinite(number) || number < 0) {
		throw new Error(`--${name} must be a non-negative number.`);
	}
	return number;
}

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function compareRuns(baseline, current, options) {
	const baselineByName = new Map(
		baseline.workloads.map((workload) => [workload.name, workload]),
	);
	const workloads = [];
	const regressions = [];
	const missingBaseline = [];

	for (const currentWorkload of current.workloads) {
		const baselineWorkload = baselineByName.get(currentWorkload.name);
		if (!baselineWorkload) {
			missingBaseline.push(currentWorkload.name);
			continue;
		}
		const entry = compareWorkload(baselineWorkload, currentWorkload, options);
		workloads.push(entry);
		if (entry.regressed) regressions.push(entry);
	}

	workloads.sort(
		(a, b) => Math.abs(b.medianChangePct) - Math.abs(a.medianChangePct),
	);

	return {
		tool: "easel-benchmark-comparison",
		version: 1,
		baseline: summarizeRun(baseline),
		current: summarizeRun(current),
		options: {
			medianThresholdPct: options.medianThresholdPct,
			p95ThresholdPct: options.p95ThresholdPct,
			failRegressionPct: options.failRegressionPct,
		},
		workloads,
		missingBaseline,
		regressions: regressions.map((entry) => entry.name),
	};
}

function compareWorkload(baseline, current, options) {
	const medianChangePct = percentChange(
		baseline.msPerFrame.median,
		current.msPerFrame.median,
	);
	const p95ChangePct = percentChange(
		baseline.msPerFrame.p95,
		current.msPerFrame.p95,
	);
	const meanChangePct = percentChange(
		baseline.msPerFrame.mean,
		current.msPerFrame.mean,
	);
	const heapDeltaMedian = current.memoryDelta?.heapUsed?.median;
	const arrayBufferDeltaMedian = current.memoryDelta?.arrayBuffers?.median;
	const medianSignal = classifyChange(
		medianChangePct,
		options.medianThresholdPct,
	);
	const p95Signal = classifyChange(p95ChangePct, options.p95ThresholdPct);
	const regressed =
		medianChangePct >= options.failRegressionPct &&
		options.failRegressionPct > 0;

	return {
		name: current.name,
		baselineMedianMs: baseline.msPerFrame.median,
		currentMedianMs: current.msPerFrame.median,
		medianChangePct,
		medianSignal,
		baselineP95Ms: baseline.msPerFrame.p95,
		currentP95Ms: current.msPerFrame.p95,
		p95ChangePct,
		p95Signal,
		meanChangePct,
		heapDeltaMedian,
		arrayBufferDeltaMedian,
		regressed,
	};
}

function summarizeRun(run) {
	return {
		tool: run.tool,
		version: run.version,
		entry: run.entry,
		runtime: run.runtime,
		options: run.options,
		workloads: run.workloads.map((workload) => workload.name),
	};
}

function percentChange(before, after) {
	if (!Number.isFinite(before) || before === 0 || !Number.isFinite(after))
		return 0;
	return ((after - before) / before) * 100;
}

function classifyChange(changePct, thresholdPct) {
	if (changePct <= -thresholdPct) return "faster";
	if (changePct >= thresholdPct) return "slower";
	return "flat";
}

function printReport(comparison) {
	console.log("# EASEL benchmark comparison");
	console.log(
		`baseline: ${comparison.baseline.entry} ${formatRuntime(comparison.baseline.runtime)}`,
	);
	console.log(
		`current: ${comparison.current.entry} ${formatRuntime(comparison.current.runtime)}`,
	);
	console.log(
		`thresholds: median ${comparison.options.medianThresholdPct}% p95 ${comparison.options.p95ThresholdPct}%`,
	);
	console.log(
		"workload\tmedian_before\tmedian_after\tmedian_change_pct\tp95_before\tp95_after\tp95_change_pct\theap_delta_median\tarray_buffer_delta_median\tsignal",
	);
	for (const workload of comparison.workloads) {
		console.log(
			[
				workload.name,
				formatNumber(workload.baselineMedianMs),
				formatNumber(workload.currentMedianMs),
				formatNumber(workload.medianChangePct),
				formatNumber(workload.baselineP95Ms),
				formatNumber(workload.currentP95Ms),
				formatNumber(workload.p95ChangePct),
				formatNumber(workload.heapDeltaMedian),
				formatNumber(workload.arrayBufferDeltaMedian),
				`${workload.medianSignal}/${workload.p95Signal}`,
			].join("\t"),
		);
	}
	if (comparison.missingBaseline.length > 0) {
		console.log(`missing baseline: ${comparison.missingBaseline.join(", ")}`);
	}
	if (comparison.regressions.length > 0) {
		console.log(`regressions: ${comparison.regressions.join(", ")}`);
	}
}

function formatRuntime(runtime) {
	if (!runtime) return "unknown-runtime";
	return `node=${runtime.node ?? "n/a"}${runtime.bun ? ` bun=${runtime.bun}` : ""} ${runtime.platform ?? "unknown"}/${runtime.arch ?? "unknown"}`;
}

function formatNumber(value) {
	return Number.isFinite(value) ? value.toFixed(3) : "n/a";
}

function printHelp() {
	console.log(`Usage: bun benchmarks/compare-results.mjs --baseline=path --current=path [options]

Options:
  --baseline=path            Baseline benchmark JSON.
  --current=path             Current benchmark JSON.
  --json=path                Write machine-readable comparison JSON.
  --median-threshold=N       Percent threshold for median signal. Default: 3.
  --p95-threshold=N          Percent threshold for p95 signal. Default: 5.
  --fail-regression=N        Exit 1 when median regression is at least N percent. Default: 0 disabled.
  --help                     Print this help.
`);
}

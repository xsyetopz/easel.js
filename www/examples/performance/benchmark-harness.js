const PIPELINE_KEYS = [
	"clearMs",
	"traversalMs",
	"fogCullMs",
	"sortMs",
	"shadeRasterMs",
	"uploadMs",
	"totalMs",
	"travUpdateWorldMs",
	"travWalkMs",
	"travProjectMs",
	"travAssembleMs",
	"travDrawCalls",
];

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   workloads: Array<{ name: string, description: string, create: () => {
 *     renderer: { render: (scene: unknown, camera: unknown, timings?: Record<string, unknown>) => void },
 *     scene: unknown,
 *     camera: unknown,
 *     metadata: Record<string, unknown>,
 *     step: (frame: number) => void,
 *   }}>,
 *   warmupFrames: number,
 *   samples: number,
 *   framesPerSample: number,
 *   profileTraversal?: boolean,
 * }} config
 */
export function runBenchmarkSuite(config) {
	const options = {
		warmupFrames: config.warmupFrames,
		samples: config.samples,
		framesPerSample: config.framesPerSample,
		profileTraversal: config.profileTraversal === true,
	};
	const result = {
		tool: "easel-browser-render-suite",
		version: 1,
		environment: getEnvironment(config.canvas),
		options,
		workloads: config.workloads.map((workload) =>
			runWorkload(workload, options),
		),
		summary: "",
	};
	result.summary = summarizeSuite(result);
	return result;
}

function runWorkload(workload, options) {
	const instance = workload.create();
	let frame = 0;
	for (; frame < options.warmupFrames; frame++) {
		instance.step(frame);
		instance.renderer.render(instance.scene, instance.camera);
	}

	const frameSamples = [];
	const pipelineSamples = [];
	for (let sample = 0; sample < options.samples; sample++) {
		const pipeline = createPipelineAccumulator();
		const start = performance.now();
		for (let i = 0; i < options.framesPerSample; i++, frame++) {
			const timings = { profileTraversal: options.profileTraversal };
			instance.step(frame);
			instance.renderer.render(instance.scene, instance.camera, timings);
			accumulatePipeline(pipeline, timings);
		}
		const elapsed = performance.now() - start;
		frameSamples.push(elapsed / options.framesPerSample);
		pipelineSamples.push(
			finalizePipelineAccumulator(pipeline, options.framesPerSample),
		);
	}

	return {
		name: workload.name,
		description: workload.description,
		metadata: instance.metadata,
		msPerFrame: summarize(frameSamples),
		fps: summarize(frameSamples.map((value) => 1000 / value)),
		pipelineMs: summarizePipeline(pipelineSamples),
	};
}

function createPipelineAccumulator() {
	const result = {};
	for (const key of PIPELINE_KEYS) result[key] = 0;
	return result;
}

function accumulatePipeline(accumulator, timings) {
	for (const key of PIPELINE_KEYS) {
		const value = timings[key];
		if (typeof value === "number") accumulator[key] += value;
	}
}

function finalizePipelineAccumulator(accumulator, frames) {
	const result = {};
	for (const key of PIPELINE_KEYS) result[key] = accumulator[key] / frames;
	return result;
}

function summarizePipeline(samples) {
	const result = {};
	for (const key of PIPELINE_KEYS) {
		result[key] = summarize(samples.map((sample) => sample[key]));
	}
	return result;
}

function summarize(values) {
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

function percentile(sorted, p) {
	if (sorted.length === 1) return sorted[0];
	const index = (sorted.length - 1) * p;
	const lower = Math.floor(index);
	const upper = Math.ceil(index);
	if (lower === upper) return sorted[lower];
	const weight = index - lower;
	return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function getEnvironment(canvas) {
	return {
		userAgent: navigator.userAgent,
		platform: navigator.platform,
		devicePixelRatio: window.devicePixelRatio,
		canvasWidth: canvas.width,
		canvasHeight: canvas.height,
		timestamp: new Date().toISOString(),
	};
}

const SUMMARY_COUNTER_KEYS = [
	"meshes",
	"tris",
	"planes",
	"quads",
	"points",
	"leaves",
	"branchFactor",
	"depth",
];

function summarizeSuite(result) {
	return result.workloads
		.map((workload) => {
			const ms = workload.msPerFrame;
			const fps = workload.fps;
			const pipeline = workload.pipelineMs;
			const drawCalls = pipeline.travDrawCalls?.median;
			const drawCallText =
				Number.isFinite(drawCalls) && drawCalls > 0
					? `, drawCalls=${formatCount(drawCalls)}`
					: "";
			const frameText = [
				`${format(fps.median, 1)} FPS median`,
				`${format(fps.p95, 1)} FPS p95`,
				`${format(ms.median)}ms median`,
				`${format(ms.p95)}ms p95`,
			].join(", ");
			const pipelineText = [
				`${format(pipeline.traversalMs?.median)}ms traversal`,
				`${format(pipeline.sortMs?.median)}ms sort`,
				`${format(pipeline.shadeRasterMs?.median)}ms shade+raster`,
				`${format(pipeline.uploadMs?.median)}ms upload`,
			].join(", ");
			return `${workload.name}: ${frameText}${formatBenchmarkCounters(workload.metadata)}${drawCallText}, ${pipelineText}`;
		})
		.join("\n");
}

function formatBenchmarkCounters(metadata = {}) {
	const counters = [];
	if (Number.isFinite(metadata.width) && Number.isFinite(metadata.height)) {
		counters.push(
			`${formatCount(metadata.width)}x${formatCount(metadata.height)}`,
		);
	}
	for (const key of SUMMARY_COUNTER_KEYS) {
		if (!Object.hasOwn(metadata, key)) continue;
		const value = metadata[key];
		if (typeof value !== "number" || !Number.isFinite(value)) continue;
		counters.push(`${formatCounterName(key)}=${formatCount(value)}`);
	}
	return counters.length > 0 ? `, ${counters.join(", ")}` : "";
}

function formatCounterName(key) {
	switch (key) {
		case "meshes":
			return "Meshes";
		case "tris":
			return "Tris";
		case "planes":
			return "Planes";
		case "quads":
			return "Quads";
		case "points":
			return "Points";
		case "leaves":
			return "Leaves";
		case "branchFactor":
			return "BranchFactor";
		case "depth":
			return "Depth";
		default:
			return key;
	}
}

function formatCount(value) {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function format(value, fractionDigits = 3) {
	return Number.isFinite(value) ? value.toFixed(fractionDigits) : "n/a";
}

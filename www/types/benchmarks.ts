export interface BenchmarkStats {
	min: number;
	median: number;
	mean: number;
	p95: number;
	max: number;
	stddev: number;
}

export interface BenchmarkEnvironment {
	userAgent: string;
	platform: string;
	devicePixelRatio: number;
	canvasWidth: number;
	canvasHeight: number;
	timestamp: string;
}

export interface BenchmarkWorkloadResult {
	name: string;
	description: string;
	metadata: Record<string, unknown>;
	msPerFrame: BenchmarkStats;
	fps: BenchmarkStats;
	pipelineMs: Record<string, BenchmarkStats>;
}

export interface BenchmarkResult {
	tool: string;
	version: number;
	environment: BenchmarkEnvironment;
	options: {
		warmupFrames: number;
		samples: number;
		framesPerSample: number;
		profileTraversal: boolean;
	};
	workloads: BenchmarkWorkloadResult[];
	summary: string;
}

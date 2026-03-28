export interface ExampleMeta {
	id: string;
	name: string;
	category: string;
	description: string;
}

export interface ExampleCatalogEntry {
	meta: ExampleMeta;
}

export interface ExampleControl {
	type: string;
	key: string;
	label: string;
	default: string | number;
	min?: number;
	max?: number;
	step?: number;
	options?: string[];
}

export interface ExampleModule {
	meta: ExampleMeta;
	controls?: ExampleControl[];
	setup: (
		canvas: HTMLCanvasElement,
		params: Record<string, string | number>,
	) =>
		| {
				cleanup?: () => void;
				update?: (params: Record<string, string | number>) => void;
		  }
		| undefined;
	easelSource: string;
	threeSource?: string | undefined;
}

export interface ExampleRouteData {
	meta: ExampleMeta;
	controls?: ExampleControl[];
	easelSource: string;
	threeSource?: string | undefined;
	setup: ExampleModule["setup"];
}

export interface ExampleCatalogData {
	categoryLabels: Record<string, string>;
	examples: ExampleCatalogEntry[];
}

interface ExampleRegistryModule {
	categoryLabels: Record<string, string>;
	examples: ExampleModule[];
}

async function loadExampleRegistry() {
	return (await import("../examples/registry.ts")) as ExampleRegistryModule;
}

export async function loadExampleCatalog(): Promise<ExampleCatalogData> {
	const { categoryLabels, examples } = await loadExampleRegistry();
	return {
		categoryLabels,
		examples: examples.map((example) => ({
			meta: example.meta,
		})),
	};
}

export async function loadExampleModule(exampleId: string) {
	const { examples } = await loadExampleRegistry();
	return examples.find((example) => example.meta.id === exampleId) ?? null;
}

export function buildExampleRouteData(
	exampleModule: ExampleModule,
): ExampleRouteData {
	return {
		meta: exampleModule.meta,
		controls: exampleModule.controls,
		easelSource: exampleModule.easelSource,
		threeSource: exampleModule.threeSource,
		setup: exampleModule.setup,
	};
}

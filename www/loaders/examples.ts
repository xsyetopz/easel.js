import type { ControlDefinition } from "../types/controls.ts";

export interface ExampleMeta {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface ExampleCatalogEntry {
  meta: ExampleMeta;
}

export type ExampleControl = ControlDefinition;
export type ExampleParams = Record<string, string | number>;

export interface ExampleBenchmarkResult {
  summary: string;
  [key: string]: unknown;
}

export interface ExampleInstance {
  cleanup?: () => void;
  update?: (params: ExampleParams) => void;
  runBenchmark?: () => ExampleBenchmarkResult | Promise<ExampleBenchmarkResult>;
}

export interface ExampleModule {
  meta: ExampleMeta;
  controls?: ExampleControl[] | undefined;
  setup: (
    canvas: HTMLCanvasElement,
    params: ExampleParams,
  ) => ExampleInstance | undefined;
  easelSource: string;
  threeSource?: string | undefined;
  noThreeReason?: string | undefined;
}

export interface ExampleRouteData {
  meta: ExampleMeta;
  controls?: ExampleControl[] | undefined;
  easelSource: string;
  threeSource?: string | undefined;
  noThreeReason?: string | undefined;
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
    noThreeReason: exampleModule.noThreeReason,
    setup: exampleModule.setup,
  };
}

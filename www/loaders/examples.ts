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

export interface ExampleRegistryEntry extends ExampleCatalogEntry {
  controls: ExampleControl[];
  easelSource: string;
  load: () => Promise<ExampleModule>;
}

export type ExampleControl = ControlDefinition;
export type ExampleParams = Record<string, string | number>;

export interface ExampleInstance {
  cleanup?: () => void;
  pause?: () => void;
  resize?: (width: number, height: number) => void;
  resume?: () => void;
  setReducedMotion?: (reduced: boolean) => void;
  update?: (params: ExampleParams) => void;
}

export interface ExampleModule {
  meta: ExampleMeta;
  controls?: ExampleControl[] | undefined;
  setup: (
    canvas: HTMLCanvasElement,
    params: ExampleParams,
  ) => ExampleInstance | undefined;
  easelSource: string;
}

export interface ExampleRouteData {
  meta: ExampleMeta;
  controls?: ExampleControl[] | undefined;
  easelSource: string;
  setup: ExampleModule["setup"];
}

export interface ExampleCatalogData {
  categoryLabels: Record<string, string>;
  examples: ExampleCatalogEntry[];
}

interface ExampleRegistryModule {
  categoryLabels: Record<string, string>;
  examples: ExampleRegistryEntry[];
}

async function loadExampleRegistry(): Promise<ExampleRegistryModule> {
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

export async function loadExampleModule(
  exampleId: string,
): Promise<ExampleModule | undefined> {
  const { examples } = await loadExampleRegistry();
  const entry = examples.find((example) => example.meta.id === exampleId);
  return entry?.load();
}

export function buildExampleRouteData(
  exampleModule: ExampleModule,
): ExampleRouteData {
  return {
    meta: exampleModule.meta,
    controls: exampleModule.controls,
    easelSource: exampleModule.easelSource,
    setup: exampleModule.setup,
  };
}

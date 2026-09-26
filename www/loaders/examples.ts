import { getSingletonHighlighter } from "shiki";

import type { ControlDefinition } from "../types/controls.ts";

export interface ExampleMeta {
  /** EASEL example id; `webgl_` upstream ids become `canvas_`. */
  id: string;
  /** Mirrored three.js r186 example id, such as `webgl_raycaster_sprite`. */
  upstream: string;
  name: string;
  category: string;
  animated: boolean;
  description: string;
  /** Visible or behavioral differences from the three.js original. */
  differences: string[];
}

/** three.js release the side-by-side ports are taken from. */
export const THREE_EXAMPLES_REVISION = "r186";

/** Returns the upstream source URL of a three.js example. */
export function threeExampleSourceUrl(id: string): string {
  return `https://github.com/mrdoob/three.js/blob/${THREE_EXAMPLES_REVISION}/examples/${id}.html`;
}

export interface ExampleCatalogEntry {
  meta: ExampleMeta;
}

export interface ExampleRegistryEntry extends ExampleCatalogEntry {
  controls: ExampleControl[];
  load: () => Promise<ExampleModule>;
  /** Loads the three.js r186 original, adapted to the same `setup` contract. */
  loadThree: () => Promise<ThreeExampleModule>;
}

export type ExampleControl = ControlDefinition;
export type ExampleParams = Record<string, string | number>;

export interface ExampleInstance {
  /** True after setup has completed one renderer-backed frame. */
  firstFrameRendered?: boolean;
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
  easelSource: string;
  setup: (
    canvas: HTMLCanvasElement,
    params: ExampleParams,
  ) => ExampleInstance | undefined;
}

/** The three.js original of an example, rendered with WebGL beside the EASEL port. */
export interface ThreeExampleModule {
  setup: ExampleModule["setup"];
}

export interface ExampleRouteData {
  meta: ExampleMeta;
  controls?: ExampleControl[] | undefined;
  setup: ExampleModule["setup"];
  sourceExcerpt: string;
}

export interface ExampleCatalogData {
  categoryLabels: Record<string, string>;
  examples: ExampleCatalogEntry[];
}

interface ExampleRegistryModule {
  categoryLabels: Record<string, string>;
  examples: ExampleRegistryEntry[];
}

const highlighter = getSingletonHighlighter({
  langs: ["javascript"],
  themes: ["github-light", "github-dark"],
});

function isImport(line: string): boolean {
  return /^import\b/u.test(line.trim());
}

type ExcerptGroup =
  | "animation"
  | "controls"
  | "export"
  | "import"
  | "input"
  | "scene"
  | "setup";

function excerptGroup(line: string): ExcerptGroup {
  const trimmed = line.trim();
  if (isImport(trimmed)) return "import";
  if (/^(?:const animator\b|animator\.)/u.test(trimmed)) return "animation";
  if (/^(?:const controls\b|controls\.)/u.test(trimmed)) return "controls";
  if (/^(?:const exporter\b|exporter\.)/u.test(trimmed)) return "export";
  if (/^(?:raycaster\.|const hit\b|if \(|for \()/u.test(trimmed))
    return "input";
  if (/^(?:scene|world)\.add\b/u.test(trimmed)) return "scene";
  return "setup";
}

/** Adds visual breaks between imports and the main operations in a source excerpt. */
export function formatSourceExcerpt(source: string): string {
  const lines = source.trim().split("\n");
  const formatted: string[] = [];
  let previousGroup: ExcerptGroup | undefined;

  for (const line of lines) {
    const group = excerptGroup(line);
    const previous = formatted.at(-1);
    const afterImportBlock = previousGroup === "import" && group !== "import";
    const beforeNewGroup =
      previous !== undefined &&
      previous.trim() !== "" &&
      previousGroup !== undefined &&
      group !== previousGroup &&
      group !== "setup";

    if (afterImportBlock || beforeNewGroup) formatted.push("");
    formatted.push(line);
    previousGroup = group;
  }

  return formatted.join("\n");
}

/** Highlights an example source excerpt at build time. */
export async function highlightSourceExcerpt(source: string): Promise<string> {
  const renderer = await highlighter;
  return renderer.codeToHtml(source, {
    lang: "javascript",
    themes: { light: "github-light", dark: "github-dark" },
  });
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
    sourceExcerpt: formatSourceExcerpt(exampleModule.easelSource),
    setup: exampleModule.setup,
  };
}

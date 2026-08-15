import path from "node:path";

export interface ApiDoc {
  category: string;
  description?: string;
  kind: "class" | "constant" | "function" | "interface" | "type";
  name: string;
}

export const ROOT = path.resolve(import.meta.dir, "../..");
export const SRC_ROOT = path.join(ROOT, "src");
export const ENTRY = path.join(SRC_ROOT, "index.ts");
export const DOCS_ROOT = path.join(
  ROOT,
  "www",
  "astro",
  "content",
  "docs",
  "docs",
);
/**
 * Website API pages cover package-facing exports outside implementation and
 * rasterization internals. The package exports remain unchanged.
 */
export function isPublicDocSourcePath(fileName: string): boolean {
  const relative = path.relative(SRC_ROOT, path.resolve(fileName));
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    return false;
  }
  const segments = relative.split(path.sep);
  return (
    segments[0] !== "pipeline" &&
    !segments.some((segment) => segment.startsWith("_"))
  );
}

export const CATEGORY_NAMES: Record<string, string> = {
  animation: "Animation",
  cameras: "Cameras",
  controls: "Controls",
  core: "Core",
  curves: "Curves",
  geometry: "Geometry",
  helpers: "Helpers",
  lights: "Lights",
  loaders: "Loaders",
  materials: "Materials",
  math: "Math",
  objects: "Objects",
  pipeline: "Pipeline",
  physics: "Physics",
  renderers: "Renderers",
  scenes: "Scene",
  textures: "Textures",
  utils: "Utilities",
};

export function lexicalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

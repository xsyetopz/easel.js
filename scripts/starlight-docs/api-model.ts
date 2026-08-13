import path from "node:path";
import * as ts from "typescript-api";

export interface ApiProperty {
	access: "read-only" | "read/write" | "write-only";
	description: string;
	name: string;
	type: string;
}

export interface ApiMethod {
	description: string;
	signature: string;
}

export interface ApiDoc {
	category: string;
	description: string;
	kind: "class" | "constant" | "function" | "interface" | "type";
	methods: ApiMethod[];
	name: string;
	properties: ApiProperty[];
	signature: string;
	sourcePath: string;
}

export const ROOT = path.resolve(import.meta.dir, "../..");
export const SRC_ROOT = path.join(ROOT, "src");
export const ENTRY = path.join(SRC_ROOT, "index.ts");
export const DOCS_ROOT = path.join(ROOT, "www", "astro", "content", "docs", "docs");
export const TYPE_FORMAT =
	ts.TypeFormatFlags.NoTruncation |
	ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

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

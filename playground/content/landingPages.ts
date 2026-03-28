export interface LandingPageSection {
	title: string;
	body: string[];
	bullets?: string[];
}

export interface LandingPageCta {
	label: string;
	href: string;
	variant?: "filled" | "light" | "outline";
}

export interface LandingPageContent {
	slug: string;
	title: string;
	description: string;
	eyebrow: string;
	intro: string;
	keywords: string[];
	sections: LandingPageSection[];
	ctas: LandingPageCta[];
}

export const landingPages: LandingPageContent[] = [
	{
		slug: "compare/easeljs",
		title: "EaselJS Alternative for CreateJS Searchers",
		description:
			"EASEL.js is not the original CreateJS EaselJS package. It is a CPU-driven Canvas2D 3D rasterizer with a THREE.js-style scene graph, aimed at browser software rendering and retro pipeline work.",
		eyebrow: "Comparison",
		intro:
			"People searching for EaselJS usually land on the CreateJS 2D display-list library. EASEL.js targets a different job: browser-side 3D scenes, painter-sorted rasterization, and Canvas2D output without WebGL.",
		keywords: [
			"easeljs alternative",
			"createjs easeljs alternative",
			"easeljs replacement",
			"canvas software renderer",
		],
		sections: [
			{
				title: "What changes if you switch?",
				body: [
					"Instead of sprites and a retained-mode 2D stage, you work with Scene, Mesh, Camera, Material, and Geometry.",
					"The output stays in Canvas2D, but the pipeline is a CPU rasterizer built for polygons, affine UV mapping, flat or Gouraud shading, and software-rendering experiments.",
				],
				bullets: [
					"THREE.js-style scene graph API",
					"Canvas2D framebuffer upload, no WebGL",
					"Examples with side-by-side EASEL.js and THREE.js code",
				],
			},
			{
				title: "Who this is for",
				body: [
					"EASEL.js fits teams building retro 3D demos, CPU-rendered experiments, software-rasterizer tutorials, or constrained rendering playgrounds in the browser.",
				],
				bullets: [
					"Retro rendering and RuneTek-style constraints",
					"Educational graphics pipelines",
					"Canvas-native 3D experiments",
				],
			},
		],
		ctas: [
			{ label: "Open the Playground", href: "/examples/hello-cube" },
			{
				label: "See THREE.js Mapping",
				href: "/compare/threejs",
				variant: "light",
			},
		],
	},
	{
		slug: "compare/threejs",
		title: "THREE.js Alternative for CPU Canvas Rendering",
		description:
			"EASEL.js keeps familiar Scene, Mesh, Camera, Light, Material, and Geometry concepts, but replaces WebGL with a Canvas2D software rasterizer driven entirely by the CPU.",
		eyebrow: "Migration",
		intro:
			"If you know THREE.js, EASEL.js is intentionally legible. The names are close, the examples include paired source, and the main shift is architectural: no GPU, no shader programs, and a renderer built around painter sorting and scanline fill.",
		keywords: [
			"three.js alternative",
			"three.js canvas renderer",
			"software renderer for the browser",
			"cpu renderer javascript",
		],
		sections: [
			{
				title: "What stays familiar",
				body: [
					"The docs already map many classes to their THREE equivalents, and examples expose both EASEL.js and THREE.js source so migration cost is visible instead of hand-waved.",
				],
				bullets: [
					"Scene graph parity where it helps",
					"Comparable geometry, lighting, animation, and math primitives",
					"Migration-oriented docs with divergence notes",
				],
			},
			{
				title: "What is intentionally different",
				body: [
					"This renderer is for constrained software rendering, not feature parity with modern GPU engines. You trade PBR and per-pixel shading for controllable CPU-side rasterization.",
				],
				bullets: [
					"Canvas2D output instead of WebGL",
					"Affine UV mapping and discrete opacity",
					"Flat and Gouraud shading only",
				],
			},
		],
		ctas: [
			{ label: "Browse the Docs", href: "/docs" },
			{
				label: "Run Performance Examples",
				href: "/examples/rasterizer-benchmark",
				variant: "light",
			},
		],
	},
	{
		slug: "canvas-software-renderer",
		title: "Canvas2D Software Renderer for the Browser",
		description:
			"EASEL.js is a browser-side Canvas2D software renderer with a CPU rasterization pipeline, a THREE.js-compatible mental model, and examples covering lighting, materials, textures, and performance.",
		eyebrow: "Category",
		intro:
			"This site should rank for the category it actually serves: Canvas2D software rendering. The library is strongest when people want explicit control over a browser rasterizer instead of WebGL abstractions.",
		keywords: [
			"canvas2d software renderer",
			"software renderer javascript",
			"browser rasterizer",
			"canvas renderer 3d",
		],
		sections: [
			{
				title: "Pipeline-first design",
				body: [
					"The renderer walks the scene, sorts draw calls, shades geometry, fills scanlines, and uploads a framebuffer to the canvas. That makes the implementation useful both as a library and as readable graphics code.",
				],
				bullets: [
					"Scene traversal",
					"Painter sort",
					"Light baking",
					"Scanline rasterization",
				],
			},
			{
				title: "Why not WebGL?",
				body: [
					"Because the point here is the opposite set of tradeoffs: readable rendering internals, old-engine constraints, and direct CPU control over how triangles become pixels.",
				],
			},
		],
		ctas: [
			{ label: "Read the Pipeline Docs", href: "/docs/Renderer" },
			{ label: "Try the Playground", href: "/examples", variant: "light" },
		],
	},
	{
		slug: "cpu-rasterizer",
		title: "CPU Rasterizer in JavaScript",
		description:
			"EASEL.js is a JavaScript CPU rasterizer for browser graphics experiments, retro 3D rendering, and educational pipeline work, with examples and API docs exposed as crawlable pages.",
		eyebrow: "Rendering",
		intro:
			"If the search intent is 'CPU rasterizer JavaScript', the site should answer directly instead of hiding the renderer behind a generic playground shell.",
		keywords: [
			"cpu rasterizer javascript",
			"javascript rasterizer",
			"scanline rasterizer",
			"painter's algorithm renderer",
		],
		sections: [
			{
				title: "Rendering constraints",
				body: [
					"EASEL.js leans into software-rasterizer limits instead of masking them. The result is a clearer fit for retro rendering, debugging, and teaching.",
				],
				bullets: [
					"CPU-only drawing path",
					"Painter-sorted visibility",
					"Nearest-neighbor texture sampling",
					"Integer-snapped screen projection",
				],
			},
			{
				title: "Best entry points",
				body: [
					"The performance, material, and texture examples show the library at its best. They should function as landing pages for people searching rendering-specific terms.",
				],
			},
		],
		ctas: [
			{
				label: "Open Rasterizer Benchmark",
				href: "/examples/rasterizer-benchmark",
			},
			{
				label: "See Material Examples",
				href: "/examples/material-types",
				variant: "light",
			},
		],
	},
];

export const landingPagesBySlug = Object.fromEntries(
	landingPages.map((page) => [page.slug, page]),
);

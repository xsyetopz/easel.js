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
  topics?: string[];
  sections: LandingPageSection[];
  ctas: LandingPageCta[];
}

export const landingPages: LandingPageContent[] = [
  {
    slug: "compare/easeljs",
    title: "Canvas2D 3D Renderer Comparison",
    description:
      "Compare a CPU-driven Canvas2D 3D rasterizer with browser 2D display-list tooling, software-rendered scenes, and retro 3D rendering pipelines.",
    eyebrow: "Comparison",
    intro:
      "For teams comparing 2D canvas stage tooling with browser-side 3D scenes, EASEL.js targets CPU rasterization, scanline fill, CPU depth tests for opaque fragments, and Canvas2D output without WebGL.",
    keywords: [
      "easeljs alternative",
      "createjs easeljs alternative",
      "easeljs replacement",
      "canvas software renderer",
    ],
    topics: [
      "Canvas2D renderer",
      "CPU rasterizer",
      "2D-stage migration",
      "software 3D",
    ],
    sections: [
      {
        title: "What changes if you switch?",
        body: [
          "Instead of sprites and a retained-mode 2D stage, you work with Scene, Mesh, Camera, Material, and Geometry.",
          "The output stays in Canvas2D, but the pipeline is a CPU rasterizer built for polygons, affine UV mapping, flat or Gouraud shading, and software-rendered 3D scenes.",
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
          "EASEL.js fits projects building retro 3D scenes, CPU-rendered Canvas effects, or constrained rendering tools in the browser.",
        ],
        bullets: [
          "Retro rendering and RuneTek-style constraints",
          "CPU Canvas rendering pipelines",
          "Canvas-native 3D scenes",
        ],
      },
    ],
    ctas: [
      { label: "Open the Examples", href: "/examples/hello-cube" },
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
      "If you know THREE.js, EASEL.js keeps familiar names and paired source examples. The main shift is architectural: no GPU, no shader programs, and a renderer built around CPU depth tests, sorted transparency, and scanline fill.",
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
      "EASEL.js targets Canvas2D software rendering: explicit control over a browser rasterizer instead of WebGL abstractions.",
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
          "The renderer walks the scene, orders draw calls, shades geometry, depth-tests opaque fragments, fills scanlines, and uploads a framebuffer to the canvas. That makes the implementation usable as a library with inspectable rendering stages.",
        ],
        bullets: [
          "Scene traversal",
          "Depth-aware draw ordering",
          "Light baking",
          "Scanline rasterization",
        ],
      },
      {
        title: "Why not WebGL?",
        body: [
          "The tradeoff is direct CPU control over how triangles become pixels, with old-engine constraints instead of GPU feature parity.",
        ],
      },
    ],
    ctas: [
      { label: "Read the Pipeline Docs", href: "/docs/Renderer" },
      { label: "Try the Examples", href: "/examples", variant: "light" },
    ],
  },
  {
    slug: "cpu-rasterizer",
    title: "CPU Rasterizer in JavaScript",
    description:
      "EASEL.js is a JavaScript CPU rasterizer for browser-side 3D rendering and retro Canvas2D scenes, with examples and API docs exposed as crawlable pages.",
    eyebrow: "Rendering",
    intro:
      "EASEL.js exposes a CPU rasterizer for JavaScript scenes that need depth-tested opaque pixels, sorted transparent draws, scanline fill, and Canvas2D framebuffer output.",
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
          "EASEL.js keeps software-rasterizer limits explicit instead of masking them. The result is a focused fit for retro rendering, debugging, and deterministic CPU-side control.",
        ],
        bullets: [
          "CPU-only drawing path",
          "CPU depth buffer for opaque fragments",
          "Sorted transparent draws",
          "Nearest-neighbor texture sampling",
          "Integer-snapped screen projection",
        ],
      },
      {
        title: "Best entry points",
        body: [
          "The performance, material, and texture examples show the library's rendering behavior, tradeoffs, and counters in live Canvas2D pages.",
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

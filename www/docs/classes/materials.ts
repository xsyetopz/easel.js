import type { DocEntry } from "../types.ts";

export const materialDocs = [
  {
    id: "Material",
    name: "Material",
    category: "Materials",
    signature:
      "new Material({ layer?, opacity?, transparent?, depthTest?, depthWrite?, shading?, side? })",
    description:
      "Base material. All materials share the layer, opacity, depth, shading, and side properties. Not intended to be used directly - use a subclass.",
    properties: [
      {
        name: "id",
        type: "number",
        description: "Auto-incrementing unique identifier.",
      },
      { name: "name", type: "string", description: "Optional display name." },
      {
        name: "layer",
        type: "number",
        description:
          "Draw order within a tile. Higher values draw later (on top). See Layer enum.",
      },
      {
        name: "opacity",
        type: "number",
        description:
          "Discrete translucency: 0 = fully opaque, 8 = nearly transparent. Only blends when transparent is true.",
      },
      {
        name: "transparent",
        type: "boolean",
        description: "Enables transparent sorting and blending. Default false.",
      },
      {
        name: "depthTest",
        type: "boolean",
        description: "Enables depth-buffer testing. Default true.",
      },
      {
        name: "depthWrite",
        type: "boolean",
        description:
          "Writes passing fragments to the depth buffer. Default true for opaque materials and false when constructed with transparent: true.",
      },
      {
        name: "shading",
        type: "number",
        description: "Shading.Flat or Shading.Gouraud.",
      },
      {
        name: "side",
        type: "number",
        description: "Side.Front, Side.Back, or Side.Double.",
      },
      {
        name: "visible",
        type: "boolean",
        description: "When false, meshes using this material are skipped.",
      },
      {
        name: "needsUpdate",
        type: "boolean",
        description: "Flag for external cache invalidation.",
      },
    ],
    methods: [
      {
        name: "clone",
        signature: "clone(): Material",
        description: "Returns a copy of this material.",
      },
      {
        name: "dispose",
        signature: "dispose(): void",
        description: "Override in subclasses to release texture references.",
      },
    ],
  },
  {
    id: "BasicMaterial",
    name: "BasicMaterial",
    category: "Materials",
    signature:
      "new BasicMaterial({ color?, map?, layer?, opacity?, transparent?, depthTest?, depthWrite?, shading?, side? })",
    description:
      "Solid color or textured material with no lighting. Geometry RGB color attributes are consumed automatically and multiplied by color; uniform faces stay on the flat path while mixed faces interpolate. Defaults to Shading.Flat.",
    properties: [
      {
        name: "color",
        type: "Color",
        description: "Surface color. Default 0xffffff.",
      },
      {
        name: "map",
        type: "Texture|undefined",
        description:
          "Optional texture map. Sampled RGB multiplies the material and geometry vertex colors.",
      },
    ],
    methods: [],
  },
  {
    id: "LambertMaterial",
    name: "LambertMaterial",
    category: "Materials",
    signature:
      "new LambertMaterial({ color?, map?, layer?, opacity?, transparent?, depthTest?, depthWrite?, shading?, side? })",
    description:
      "Diffuse lighting material. Receives contributions from all scene lights and multiplies them by any geometry RGB color attribute. Defaults to Shading.Gouraud (per-vertex, interpolated across faces).",
    properties: [
      {
        name: "color",
        type: "Color",
        description: "Surface color. Default 0xffffff.",
      },
      {
        name: "map",
        type: "Texture|undefined",
        description: "Optional texture map.",
      },
    ],
    methods: [],
  },
  {
    id: "ToonMaterial",
    name: "ToonMaterial",
    category: "Materials",
    signature:
      "new ToonMaterial({ color?, gradientMap?, layer?, opacity?, transparent?, depthTest?, depthWrite?, side? })",
    description:
      "Stepped cel shading. Lighting is evaluated per-vertex and snapped to the nearest HSL16 step defined by the gradientMap.",
    properties: [
      {
        name: "color",
        type: "Color",
        description: "Base surface color. Default 0xffffff.",
      },
      {
        name: "gradientMap",
        type: "Texture|undefined",
        description:
          "1D texture defining lighting steps. Each texel maps an intensity level to a final color.",
      },
    ],
    methods: [],
  },
  {
    id: "LineMaterial",
    name: "LineMaterial",
    category: "Materials",
    signature:
      "new LineMaterial({ color?, linewidth?, layer?, opacity?, transparent?, depthTest?, depthWrite? })",
    description:
      "Material for Line, LineSegments, and LineLoop objects. Rendered via Bresenham integer line rasterization.",
    properties: [
      {
        name: "color",
        type: "Color",
        description: "Line color. Default 0xffffff.",
      },
      {
        name: "linewidth",
        type: "number",
        description: "Line width in pixels. Default 1.",
      },
    ],
    methods: [],
  },
  {
    id: "DashedLineMaterial",
    name: "DashedLineMaterial",
    category: "Materials",
    signature:
      "new DashedLineMaterial({ color?, linewidth?, dashSize?, gapSize?, layer?, opacity?, transparent?, depthTest?, depthWrite? })",
    description:
      "Dashed variant of LineMaterial. Alternates between visible dashes and gaps along each line segment.",
    properties: [
      {
        name: "color",
        type: "Color",
        description: "Line color. Default 0xffffff.",
      },
      {
        name: "linewidth",
        type: "number",
        description: "Line width in pixels. Default 1.",
      },
      {
        name: "dashSize",
        type: "number",
        description: "Length of each visible dash. Default 3.",
      },
      {
        name: "gapSize",
        type: "number",
        description: "Length of each gap between dashes. Default 1.",
      },
    ],
    methods: [],
  },
  {
    id: "PointsMaterial",
    name: "PointsMaterial",
    category: "Materials",
    signature:
      "new PointsMaterial({ color?, size?, map?, layer?, opacity?, transparent?, depthTest?, depthWrite? })",
    description:
      "Material for Points objects. Each vertex is rasterized as a filled square of the given pixel size.",
    properties: [
      {
        name: "color",
        type: "Color",
        description: "Point color. Default 0xffffff.",
      },
      {
        name: "size",
        type: "number",
        description: "Point size in pixels. Default 1.",
      },
      {
        name: "map",
        type: "Texture|undefined",
        description: "Optional texture applied per point.",
      },
    ],
    methods: [],
  },
] satisfies DocEntry[];

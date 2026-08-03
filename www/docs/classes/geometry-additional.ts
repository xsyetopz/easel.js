import type { DocEntry } from "../types.ts";

export const geometryAdditionalDocs = [
  {
    id: "Attribute",
    name: "Attribute",
    category: "Geometry",
    signature: "new Attribute(array: TypedArray | number[], itemSize: number)",
    description:
      "Typed array wrapper for vertex attributes (position, normal, uv, color). Each vertex consumes itemSize consecutive elements.",
    properties: [
      {
        name: "array",
        type: "Float32Array|Uint16Array|Uint32Array",
        description: "Backing typed array.",
      },
      {
        name: "itemSize",
        type: "number",
        description: "Number of array elements per vertex.",
      },
      {
        name: "count",
        type: "number",
        description: "Number of vertices (array.length / itemSize).",
      },
      {
        name: "needsUpdate",
        type: "boolean",
        description: "Flag for external cache invalidation.",
      },
    ],
    methods: [
      {
        name: "getX",
        signature: "getX(index: number): number",
        description: "Returns the first component at vertex index.",
      },
      {
        name: "getY",
        signature: "getY(index: number): number",
        description: "Returns the second component at vertex index.",
      },
      {
        name: "getZ",
        signature: "getZ(index: number): number",
        description: "Returns the third component at vertex index.",
      },
      {
        name: "setXYZ",
        signature:
          "setXYZ(index: number, x: number, y: number, z: number): this",
        description: "Writes three components at vertex index.",
      },
      {
        name: "clone",
        signature: "clone(): Attribute",
        description: "Returns a new Attribute with a copied array.",
      },
    ],
  },
  {
    id: "InterleavedBuffer",
    name: "InterleavedBuffer",
    category: "Geometry",
    signature: "new InterleavedBuffer(array: TypedArray, stride: number)",
    description:
      "Shared typed array where multiple attributes are packed with a fixed stride. Each attribute reads at a different offset.",
    properties: [
      {
        name: "array",
        type: "Float32Array|Int32Array|Uint32Array|Uint16Array",
        description: "Backing interleaved data.",
      },
      {
        name: "stride",
        type: "number",
        description: "Number of elements between consecutive vertices.",
      },
      {
        name: "count",
        type: "number",
        description: "Number of vertices (array.length / stride).",
      },
    ],
    methods: [
      {
        name: "clone",
        signature: "clone(): InterleavedBuffer",
        description: "Returns a new InterleavedBuffer with a copied array.",
      },
    ],
  },
  {
    id: "InterleavedAttribute",
    name: "InterleavedAttribute",
    category: "Geometry",
    signature:
      "new InterleavedAttribute(data: InterleavedBuffer, itemSize: number, offset: number)",
    description:
      "View into an InterleavedBuffer at a specific offset. Multiple InterleavedAttributes can share the same buffer.",
    properties: [
      {
        name: "data",
        type: "InterleavedBuffer",
        description: "The shared buffer this attribute reads from.",
      },
      {
        name: "itemSize",
        type: "number",
        description: "Number of components per vertex.",
      },
      {
        name: "offset",
        type: "number",
        description: "Element offset within each stride.",
      },
      {
        name: "count",
        type: "number",
        description: "Number of vertices (delegates to buffer).",
      },
    ],
    methods: [
      {
        name: "getX",
        signature: "getX(index: number): number",
        description: "Returns the first component at vertex index.",
      },
      {
        name: "getY",
        signature: "getY(index: number): number",
        description: "Returns the second component at vertex index.",
      },
      {
        name: "getZ",
        signature: "getZ(index: number): number",
        description: "Returns the third component at vertex index.",
      },
    ],
  },
] satisfies DocEntry[];

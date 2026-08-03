import type { DocEntry } from "../types.ts";

export const objectDocs = [
  {
    id: "Mesh",
    name: "Mesh",
    category: "Objects",
    signature: "new Mesh(geometry?, material?)",
    description:
      "Scene-graph node that pairs a Geometry with a Material for rasterization. The renderer only draws visible Meshes with both properties set.",
    properties: [
      {
        name: "geometry",
        type: "Geometry|undefined",
        description: "Vertex data to rasterize.",
      },
      {
        name: "material",
        type: "Material|undefined",
        description: "Shading parameters.",
      },
    ],
    methods: [
      {
        name: "clone",
        signature: "clone(): Mesh",
        description:
          "Returns a shallow copy sharing the same geometry and material references.",
      },
    ],
  },
  {
    id: "Group",
    name: "Group",
    category: "Objects",
    signature: "new Group()",
    description:
      "Empty scene-graph node used to group children under a common transform. Has no geometry or material of its own.",
    properties: [],
    methods: [],
  },
  {
    id: "Line",
    name: "Line",
    category: "Objects",
    signature: "new Line(geometry?, material?)",
    description:
      "Scene-graph node that renders a continuous polyline from a Geometry's position attribute using a LineMaterial.",
    properties: [
      {
        name: "geometry",
        type: "Geometry|undefined",
        description: "Vertex data.",
      },
      {
        name: "material",
        type: "LineMaterial|undefined",
        description: "Line shading parameters.",
      },
    ],
    methods: [],
  },
  {
    id: "LineLoop",
    name: "LineLoop",
    category: "Objects",
    signature: "new LineLoop(geometry?, material?)",
    description:
      "Like Line, but adds an implicit closing segment connecting the last vertex back to the first.",
    properties: [
      {
        name: "geometry",
        type: "Geometry|undefined",
        description: "Vertex data.",
      },
      {
        name: "material",
        type: "LineMaterial|undefined",
        description: "Line shading parameters.",
      },
    ],
    methods: [],
  },
  {
    id: "LineSegments",
    name: "LineSegments",
    category: "Objects",
    signature: "new LineSegments(geometry?, material?)",
    description:
      "Renders vertices as independent line segments consumed in pairs (v0-v1, v2-v3, etc.).",
    properties: [
      {
        name: "geometry",
        type: "Geometry|undefined",
        description: "Vertex data.",
      },
      {
        name: "material",
        type: "LineMaterial|undefined",
        description: "Line shading parameters.",
      },
    ],
    methods: [],
  },
  {
    id: "Points",
    name: "Points",
    category: "Objects",
    signature: "new Points(geometry?, material?)",
    description:
      "Renders each vertex in the geometry as a discrete point using a PointsMaterial.",
    properties: [
      {
        name: "geometry",
        type: "Geometry|undefined",
        description: "Vertex data.",
      },
      {
        name: "material",
        type: "PointsMaterial|undefined",
        description: "Point shading parameters.",
      },
    ],
    methods: [],
  },
  {
    id: "Bone",
    name: "Bone",
    category: "Objects",
    signature: "new Bone()",
    description:
      "Scene-graph node representing a single bone in a Skeleton. Used with SkinnedMesh for skeletal animation.",
    properties: [],
    methods: [],
  },
  {
    id: "Skeleton",
    name: "Skeleton",
    category: "Objects",
    signature: "new Skeleton(bones?: Bone[], boneInverses?: Matrix4[])",
    description:
      "Holds a set of Bones and their inverse bind matrices for skeletal animation. Automatically computes inverses if not provided.",
    properties: [
      {
        name: "bones",
        type: "Bone[]",
        description: "Array of bones in this skeleton (read-only).",
      },
      {
        name: "boneInverses",
        type: "Matrix4[]",
        description: "Inverse bind matrices, one per bone (read-only).",
      },
      {
        name: "boneMatrices",
        type: "Float32Array",
        description:
          "Flat buffer of 16 floats per bone containing current bone transforms (read-only).",
      },
    ],
    methods: [
      {
        name: "calculateInverses",
        signature: "calculateInverses(): void",
        description:
          "Computes inverse world matrices for all bones from their current transforms.",
      },
      {
        name: "pose",
        signature: "pose(): void",
        description: "Restores all bones to their bind pose.",
      },
      {
        name: "update",
        signature: "update(): void",
        description:
          "Writes boneMatrices from each bone's current matrixWorld multiplied by its boneInverse.",
      },
      {
        name: "getBoneByName",
        signature: "getBoneByName(name: string): Bone|undefined",
        description: "Returns the first bone with the given name.",
      },
      {
        name: "dispose",
        signature: "dispose(): void",
        description: "Releases the boneMatrices buffer.",
      },
    ],
  },
  {
    id: "SkinnedMesh",
    name: "SkinnedMesh",
    category: "Objects",
    signature: "new SkinnedMesh(geometry?, material?)",
    description:
      "Mesh with skeletal animation support. Vertices are transformed by weighted bone influences before rasterization.",
    properties: [
      {
        name: "bindMode",
        type: "string",
        description:
          "'attached' or 'detached'. Controls how the bind matrix is applied. Default 'attached'.",
      },
      {
        name: "bindMatrix",
        type: "Matrix4",
        description: "Matrix mapping mesh space to bone space (read-only).",
      },
      {
        name: "bindMatrixInverse",
        type: "Matrix4",
        description: "Inverse of bindMatrix (read-only).",
      },
      {
        name: "skeleton",
        type: "Skeleton|undefined",
        description: "Bound skeleton (read-only). Set via bind().",
      },
    ],
    methods: [
      {
        name: "bind",
        signature: "bind(skeleton: Skeleton, bindMatrix?: Matrix4): void",
        description:
          "Binds a skeleton to this mesh with an optional custom bind matrix.",
      },
      {
        name: "pose",
        signature: "pose(): void",
        description: "Restores the skeleton to its bind pose.",
      },
      {
        name: "normalizeSkinWeights",
        signature: "normalizeSkinWeights(): void",
        description: "Ensures skin weights for each vertex sum to 1.",
      },
      {
        name: "boneTransform",
        signature: "boneTransform(index: number, target: Vector3): void",
        description:
          "Computes the skinned position for vertex at the given index and writes it to target.",
      },
    ],
  },
  {
    id: "InstancedMesh",
    name: "InstancedMesh",
    category: "Objects",
    signature: "new InstancedMesh(geometry?, material?, count?)",
    description:
      "Renders multiple instances of the same geometry/material pair with per-instance transforms and optional per-instance colors. Each instance becomes a separate draw call, so use for entities/particles (100s of shared models), not per-face terrain (use merged Geometry instead).",
    properties: [
      {
        name: "count",
        type: "number",
        description: "Number of instances to render.",
      },
      {
        name: "instanceMatrix",
        type: "Float32Array",
        description:
          "Flat buffer of 16 floats per instance (column-major matrices). Read-only.",
      },
      {
        name: "instanceColor",
        type: "Float32Array|undefined",
        description:
          "Flat buffer of 3 floats per instance (RGB). Set via setColorAt.",
      },
    ],
    methods: [
      {
        name: "getMatrixAt",
        signature: "getMatrixAt(index: number, matrix: Matrix4): void",
        description:
          "Reads the transform matrix for instance at index into the target matrix.",
      },
      {
        name: "setMatrixAt",
        signature: "setMatrixAt(index: number, matrix: Matrix4): void",
        description: "Writes a transform matrix for instance at index.",
      },
      {
        name: "getColorAt",
        signature: "getColorAt(index: number, color: Color): void",
        description:
          "Reads the color for instance at index into the target color.",
      },
      {
        name: "setColorAt",
        signature: "setColorAt(index: number, color: Color): void",
        description:
          "Writes a color for instance at index. Allocates instanceColor on first call.",
      },
      {
        name: "dispose",
        signature: "dispose(): void",
        description: "Releases instance buffers.",
      },
    ],
  },
  {
    id: "Sprite",
    name: "Sprite",
    category: "Objects",
    signature: "new Sprite(material?)",
    description:
      "Camera-facing quad rendered from a material's texture. Always faces the camera regardless of scene orientation.",
    properties: [
      {
        name: "material",
        type: "Material|undefined",
        description: "Material providing the sprite texture.",
      },
    ],
    methods: [],
  },
] satisfies DocEntry[];

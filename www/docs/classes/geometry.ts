import type { DocEntry } from "../types.ts";

export const geometryDocs = [
  {
    id: "Geometry",
    name: "Geometry",
    category: "Geometry",
    signature: "new Geometry()",
    description:
      "Vertex data store. Holds named attributes (position, normal, uv, color) plus an optional triangle index. RGB color attributes are consumed automatically by BasicMaterial and LambertMaterial; material RGB multiplies vertex RGB and mixed colors interpolate per triangle.",
    properties: [
      {
        name: "id",
        type: "number",
        description: "Auto-incrementing unique identifier.",
      },
      { name: "name", type: "string", description: "Optional display name." },
      {
        name: "attributes",
        type: "Map<string, Attribute>",
        description: "Named vertex attribute map (read-only).",
      },
      {
        name: "index",
        type: "Uint16Array|Uint32Array|undefined",
        description: "Triangle index list (read-only).",
      },
      {
        name: "boundingBox",
        type: "Box3|undefined",
        description: "Computed bounding box. Not set automatically.",
      },
      {
        name: "boundingSphere",
        type: "Sphere|undefined",
        description:
          "Computed bounding sphere. Set by computeBoundingSphere().",
      },
    ],
    methods: [
      {
        name: "setPositions",
        signature: "setPositions(array: Float32Array | number[]): this",
        description: "Sets the position attribute from a flat XYZ array.",
      },
      {
        name: "setNormals",
        signature: "setNormals(array: Float32Array | number[]): this",
        description: "Sets the normal attribute from a flat XYZ array.",
      },
      {
        name: "setUVs",
        signature: "setUVs(array: Float32Array | number[]): this",
        description: "Sets the uv attribute from a flat UV array.",
      },
      {
        name: "setColors",
        signature: "setColors(array: Float32Array | number[]): this",
        description:
          "Sets the RGB per-vertex color attribute from a flat array in the 0–1 range. BasicMaterial and LambertMaterial consume it automatically; alpha remains material-wide.",
      },
      {
        name: "setIndex",
        signature:
          "setIndex(array: Uint16Array | Uint32Array | number[]): this",
        description:
          "Sets the triangle index list. Automatically chooses Uint16Array or Uint32Array.",
      },
      {
        name: "getAttribute",
        signature: "getAttribute(name: string): Attribute|undefined",
        description: "Returns a named attribute, or undefined if not present.",
      },
      {
        name: "setAttribute",
        signature: "setAttribute(name: string, attribute: Attribute): this",
        description: "Adds or replaces a named attribute.",
      },
      {
        name: "deleteAttribute",
        signature: "deleteAttribute(name: string): boolean",
        description: "Removes a named attribute. Returns true if it existed.",
      },
      {
        name: "computeVertexNormals",
        signature: "computeVertexNormals(): this",
        description:
          "Computes flat per-vertex normals from the position attribute using cross products.",
      },
      {
        name: "computeBoundingSphere",
        signature: "computeBoundingSphere(): this",
        description:
          "Computes a minimal bounding sphere from the position attribute and stores it in boundingSphere.",
      },
      {
        name: "dispose",
        signature: "dispose(): void",
        description: "Clears all attributes and the index, freeing memory.",
      },
    ],
  },
  {
    id: "BoxGeometry",
    name: "BoxGeometry",
    category: "Geometry",
    signature:
      "new BoxGeometry(width?, height?, depth?, widthSegments?, heightSegments?, depthSegments?)",
    description:
      "Rectangular cuboid with per-face subdivision. Builds positions, normals, UVs, and an index on construction.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ width, height, depth, widthSegments, heightSegments, depthSegments } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "SphereGeometry",
    name: "SphereGeometry",
    category: "Geometry",
    signature:
      "new SphereGeometry(radius?, widthSegments?, heightSegments?, phiStart?, phiLength?, thetaStart?, thetaLength?)",
    description:
      "Parametric UV sphere. Supports partial spheres via phi/theta range parameters.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "CylinderGeometry",
    name: "CylinderGeometry",
    category: "Geometry",
    signature:
      "new CylinderGeometry(radiusTop?, radiusBottom?, height?, radialSegments?, heightSegments?, openEnded?, thetaStart?, thetaLength?)",
    description:
      "Cylinder or truncated cone with optional caps and partial arc support. When radiusTop ≠ radiusBottom the result is a cone frustum.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "PlaneGeometry",
    name: "PlaneGeometry",
    category: "Geometry",
    signature:
      "new PlaneGeometry(width?, height?, widthSegments?, heightSegments?)",
    description:
      "Flat rectangular grid on the XY plane (z = 0) with configurable subdivision.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ width, height, widthSegments, heightSegments } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "TorusKnotGeometry",
    name: "TorusKnotGeometry",
    category: "Geometry",
    signature:
      "new TorusKnotGeometry(radius?, tube?, tubularSegments?, radialSegments?, p?, q?)",
    description:
      "Torus knot geometry. p and q control the winding. Positions, normals, and UVs are computed analytically.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ radius, tube, tubularSegments, radialSegments, p, q } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "CapsuleGeometry",
    name: "CapsuleGeometry",
    category: "Geometry",
    signature:
      "new CapsuleGeometry(radius?, length?, capSegments?, radialSegments?)",
    description:
      "Capsule shape (hemisphere-cylinder-hemisphere) generated via LatheGeometry revolution around the Y axis.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ radius, length, capSegments, radialSegments } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "ConeGeometry",
    name: "ConeGeometry",
    category: "Geometry",
    signature:
      "new ConeGeometry(radius?, height?, radialSegments?, heightSegments?, openEnded?, thetaStart?, thetaLength?)",
    description:
      "Cone geometry. Delegates to CylinderGeometry with radiusTop = 0.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "DodecahedronGeometry",
    name: "DodecahedronGeometry",
    category: "Geometry",
    signature: "new DodecahedronGeometry(radius?, detail?)",
    description:
      "Regular dodecahedron projected onto a sphere. Extends PolyhedronGeometry with detail-level subdivision.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description: "{ radius, detail } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "EdgesGeometry",
    name: "EdgesGeometry",
    category: "Geometry",
    signature: "new EdgesGeometry(geometry: Geometry, thresholdAngle?)",
    description:
      "Extracts edges where adjacent face normals differ by more than thresholdAngle degrees. Outputs non-indexed line-pair positions for use with LineSegments.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ geometry, thresholdAngle } - stored for reference. thresholdAngle is in degrees, default 1.",
      },
    ],
    methods: [],
  },
  {
    id: "ExtrudeGeometry",
    name: "ExtrudeGeometry",
    category: "Geometry",
    signature:
      "new ExtrudeGeometry(shapes, options?: { depth?, steps?, bevelEnabled?, bevelThickness?, bevelSize?, bevelSegments? })",
    description:
      "Extrudes 2D shapes into 3D geometry with front/back faces and side walls. Uses earcut for triangulation.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description: "{ shapes, options } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "IcosahedronGeometry",
    name: "IcosahedronGeometry",
    category: "Geometry",
    signature: "new IcosahedronGeometry(radius?, detail?)",
    description:
      "Regular icosahedron projected onto a sphere. Extends PolyhedronGeometry with detail-level subdivision.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description: "{ radius, detail } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "LatheGeometry",
    name: "LatheGeometry",
    category: "Geometry",
    signature:
      "new LatheGeometry(points: Vector2[], segments?, phiStart?, phiLength?)",
    description:
      "Surface of revolution generated by rotating a 2D profile (x = radius, y = height) around the Y axis.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ points, segments, phiStart, phiLength } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "OctahedronGeometry",
    name: "OctahedronGeometry",
    category: "Geometry",
    signature: "new OctahedronGeometry(radius?, detail?)",
    description:
      "Regular octahedron projected onto a sphere. Extends PolyhedronGeometry with detail-level subdivision.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description: "{ radius, detail } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "PolyhedronGeometry",
    name: "PolyhedronGeometry",
    category: "Geometry",
    signature:
      "new PolyhedronGeometry(vertices: number[], indices: number[], radius?, detail?)",
    description:
      "Base class for platonic solid geometries. Subdivides input triangles and projects all vertices onto a sphere of the given radius.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ vertices, indices, radius, detail } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "RingGeometry",
    name: "RingGeometry",
    category: "Geometry",
    signature:
      "new RingGeometry(innerRadius?, outerRadius?, thetaSegments?, phiSegments?, thetaStart?, thetaLength?)",
    description:
      "Flat annulus on the XY plane with configurable inner/outer radii and partial arc support.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "ShapeGeometry",
    name: "ShapeGeometry",
    category: "Geometry",
    signature: "new ShapeGeometry(shapes, curveSegments?)",
    description:
      "Triangulates 2D shapes into flat geometry on the XY plane using earcut. Supports holes.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description: "{ shapes, curveSegments } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "TetrahedronGeometry",
    name: "TetrahedronGeometry",
    category: "Geometry",
    signature: "new TetrahedronGeometry(radius?, detail?)",
    description:
      "Regular tetrahedron projected onto a sphere. Extends PolyhedronGeometry with detail-level subdivision.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description: "{ radius, detail } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "TorusGeometry",
    name: "TorusGeometry",
    category: "Geometry",
    signature:
      "new TorusGeometry(radius?, tube?, radialSegments?, tubularSegments?, arc?)",
    description:
      "Torus (donut) with configurable major/minor radii and partial arc support.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ radius, tube, radialSegments, tubularSegments, arc } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "TubeGeometry",
    name: "TubeGeometry",
    category: "Geometry",
    signature:
      "new TubeGeometry(path: Curve, tubularSegments?, radius?, radialSegments?, closed?)",
    description:
      "Tube swept along a 3D curve using rotation-minimizing frames. Accepts any Curve subclass with 3D getPointAt/getTangentAt.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description:
          "{ path, tubularSegments, radius, radialSegments, closed } - stored for reference.",
      },
    ],
    methods: [],
  },
  {
    id: "WireframeGeometry",
    name: "WireframeGeometry",
    category: "Geometry",
    signature: "new WireframeGeometry(geometry: Geometry)",
    description:
      "Converts all triangle edges into non-indexed line-pair segments with shared-edge deduplication. Use with LineSegments.",
    properties: [
      {
        name: "parameters",
        type: "object",
        description: "{ geometry } - stored for reference.",
      },
    ],
    methods: [],
  },
] satisfies DocEntry[];

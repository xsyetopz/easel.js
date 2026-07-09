import type { DocEntry } from "../types.ts";

export const geometryDocs = [
	{
		id: "Geometry",
		name: "Geometry",
		category: "Geometry",
		signature: "new Geometry()",
		description:
			"Vertex data store. Holds named attributes (position, normal, uv, color) plus an optional triangle index. Per-vertex color is first-class alongside positions and UVs.",
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
					"Sets the per-vertex color attribute from a flat RGB array (0–1 range).",
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
		threeEquivalent: "THREE.BufferGeometry",
		divergence:
			"No GPU buffers exist. setPositions/setNormals/setUVs/setColors are convenience wrappers over setAttribute.",
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
		threeEquivalent: "THREE.BoxGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.SphereGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.CylinderGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.PlaneGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.TorusKnotGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.CapsuleGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.ConeGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.DodecahedronGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.EdgesGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.ExtrudeGeometry",
		divergence: "Bevel is not yet supported.",
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
		threeEquivalent: "THREE.IcosahedronGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.LatheGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.OctahedronGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.PolyhedronGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.RingGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.ShapeGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.TetrahedronGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.TorusGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.TubeGeometry",
		divergence: undefined,
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
		threeEquivalent: "THREE.WireframeGeometry",
		divergence: undefined,
	},
] satisfies DocEntry[];

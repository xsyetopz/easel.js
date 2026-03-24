/** @typedef {{ id: string, name: string, category: string, signature: string, description: string, properties: Array<{ name: string, type: string, description: string }>, methods: Array<{ name: string, signature: string, description: string }>, threeEquivalent: string|undefined, divergence: string|undefined }} DocEntry */

/** @type {string[]} */
export const docCategories = [
	"Core",
	"Cameras",
	"Geometry",
	"Materials",
	"Lights",
	"Objects",
	"Animation",
	"Textures",
	"Scene",
	"Controls",
	"Helpers",
	"Math",
	"Loaders",
	"Curves",
];

/** @type {DocEntry[]} */
export const docClasses = [
	// ── Core ──────────────────────────────────────────────────────────────────
	{
		id: "EventDispatcher",
		name: "EventDispatcher",
		category: "Core",
		signature: "new EventDispatcher()",
		description:
			"Base class for objects that emit events. All scene-graph nodes and controls extend this.",
		properties: [],
		methods: [
			{
				name: "addEventListener",
				signature: "addEventListener(type: string, listener: Function): this",
				description: "Registers a listener for events of the given type.",
			},
			{
				name: "removeEventListener",
				signature:
					"removeEventListener(type: string, listener: Function): this",
				description: "Removes a previously registered listener.",
			},
			{
				name: "hasEventListener",
				signature:
					"hasEventListener(type: string, listener: Function): boolean",
				description: "Returns true if the listener is currently registered.",
			},
			{
				name: "dispatchEvent",
				signature: "dispatchEvent(event: { type: string }): void",
				description: "Calls all listeners registered for the given event type.",
			},
		],
		threeEquivalent: "THREE.EventDispatcher",
		divergence: undefined,
	},
	{
		id: "Node",
		name: "Node",
		category: "Core",
		signature: "new Node()",
		description:
			"Scene-graph node. Holds transform (position, rotation, scale), parent/child hierarchy, and world-matrix bookkeeping.",
		properties: [
			{
				name: "id",
				type: "number",
				description: "Auto-incrementing unique identifier.",
			},
			{ name: "name", type: "string", description: "Optional display name." },
			{
				name: "type",
				type: "string",
				description: 'Class tag, e.g. "Node", "Mesh".',
			},
			{
				name: "parent",
				type: "Node|undefined",
				description: "Parent node in the scene graph.",
			},
			{ name: "children", type: "Node[]", description: "Direct child nodes." },
			{ name: "position", type: "Vector3", description: "Local position." },
			{
				name: "rotation",
				type: "Euler",
				description: "Local Euler rotation (XYZ order).",
			},
			{
				name: "quaternion",
				type: "Quaternion",
				description: "Local quaternion. Synced with rotation.",
			},
			{
				name: "scale",
				type: "Vector3",
				description: "Local scale, defaults to (1, 1, 1).",
			},
			{
				name: "matrix",
				type: "Matrix4",
				description: "Local transform matrix.",
			},
			{
				name: "matrixWorld",
				type: "Matrix4",
				description: "World-space transform matrix.",
			},
			{
				name: "autoUpdateMatrix",
				type: "boolean",
				description:
					"When true, matrix is rebuilt from TRS on each updateMatrixWorld call.",
			},
			{
				name: "visible",
				type: "boolean",
				description: "Whether this node and its descendants are rendered.",
			},
			{
				name: "frustumCulled",
				type: "boolean",
				description:
					"When true, the renderer skips this node if its bounding sphere falls outside the camera frustum. Evaluated during SceneTraversal.",
			},
			{
				name: "layers",
				type: "Layers",
				description: "Layer bitmask used for raycasting visibility.",
			},
			{
				name: "userData",
				type: "Record<string, *>",
				description: "Arbitrary user data. Not used by the renderer.",
			},
		],
		methods: [
			{
				name: "add",
				signature: "add(object: Node): this",
				description: "Appends a child node, reparenting it if necessary.",
			},
			{
				name: "remove",
				signature: "remove(object: Node): this",
				description: "Removes a child node.",
			},
			{
				name: "traverse",
				signature: "traverse(callback: (node: Node) => void): void",
				description: "Depth-first traversal of this node and all descendants.",
			},
			{
				name: "traverseVisible",
				signature: "traverseVisible(callback: (node: Node) => void): void",
				description: "Like traverse, but skips invisible subtrees.",
			},
			{
				name: "lookAt",
				signature:
					"lookAt(target: Vector3 | number, y?: number, z?: number): this",
				description: "Rotates this node to face a world-space point.",
			},
			{
				name: "updateMatrix",
				signature: "updateMatrix(): void",
				description:
					"Rebuilds the local matrix from position, quaternion, and scale.",
			},
			{
				name: "updateMatrixWorld",
				signature:
					"updateMatrixWorld(updateParents?: boolean, updateChildren?: boolean): void",
				description: "Propagates world-matrix updates through the hierarchy.",
			},
			{
				name: "clone",
				signature: "clone(): Node",
				description: "Returns a deep copy of this node and its subtree.",
			},
		],
		threeEquivalent: "THREE.Object3D",
		divergence:
			"No layers.enable/disable helpers - assign the Layers bitmask directly.",
	},
	{
		id: "Scene",
		name: "Scene",
		category: "Core",
		signature: "new Scene()",
		description:
			"Root container for all visible objects, lights, and fog. Pass to Renderer.render() along with a camera.",
		properties: [
			{
				name: "background",
				type: "Color|number|undefined",
				description:
					"Background clear color. Accepts a Color instance or hex number. Overridden by fog color when fog is set.",
			},
			{
				name: "fog",
				type: "Fog|undefined",
				description:
					"Scene-level fog. Set to a Fog instance to enable linear depth fog.",
			},
		],
		methods: [
			{
				name: "clone",
				signature: "clone(): Scene",
				description: "Returns a deep copy of the scene including its subtree.",
			},
		],
		threeEquivalent: "THREE.Scene",
		divergence:
			"No environment map or texture backgrounds. background accepts Color or hex only. When fog is set, its color overrides background.",
	},
	{
		id: "Clock",
		name: "Clock",
		category: "Core",
		signature: "new Clock(autoStart?: boolean)",
		description:
			"Frame-delta timer. Access the delta getter each frame to drive animations. Auto-starts on first access when autoStart is true.",
		properties: [
			{
				name: "delta",
				type: "number",
				description:
					"Seconds elapsed since the last time delta was accessed. Auto-starts the clock if autoStart is true.",
			},
			{
				name: "elapsedTime",
				type: "number",
				description: "Total seconds elapsed since the clock started.",
			},
		],
		methods: [
			{
				name: "start",
				signature: "start(): void",
				description:
					"Starts or restarts the clock, resetting elapsedTime to zero.",
			},
			{
				name: "stop",
				signature: "stop(): void",
				description: "Stops the clock and disables autoStart.",
			},
		],
		threeEquivalent: "THREE.Clock",
		divergence:
			"getDelta() is a getter (clock.delta) rather than a method call. getElapsedTime() is likewise clock.elapsedTime.",
	},
	{
		id: "Raycaster",
		name: "Raycaster",
		category: "Core",
		signature:
			"new Raycaster(origin?: Vector3, direction?: Vector3, near?: number, far?: number)",
		description:
			"Casts a ray through the scene and collects intersections with Mesh, Line, LineSegments, LineLoop, and Points objects.",
		properties: [
			{
				name: "ray",
				type: "Ray",
				description: "The underlying Ray (origin + direction).",
			},
			{
				name: "near",
				type: "number",
				description: "Minimum intersection distance. Default 0.",
			},
			{
				name: "far",
				type: "number",
				description: "Maximum intersection distance. Default Infinity.",
			},
			{
				name: "threshold",
				type: "number",
				description:
					"Distance tolerance for Line and Points intersection tests. Default 1.",
			},
			{
				name: "camera",
				type: "Camera|undefined",
				description: "Camera used by setFromCamera.",
			},
			{
				name: "layers",
				type: "Layers",
				description: "Restricts which scene objects are tested.",
			},
		],
		methods: [
			{
				name: "set",
				signature: "set(origin: Vector3, direction: Vector3): this",
				description: "Manually sets the ray origin and direction.",
			},
			{
				name: "setFromCamera",
				signature:
					"setFromCamera(coords: { x: number, y: number }, camera: Camera): this",
				description:
					"Builds the ray from NDC coordinates [-1, 1] and a camera.",
			},
			{
				name: "intersectObject",
				signature:
					"intersectObject(object: Node, recursive?: boolean, intersects?: Intersection[]): Intersection[]",
				description:
					"Tests one object (and optionally its subtree) against the ray. Returns intersections sorted by distance.",
			},
			{
				name: "intersectObjects",
				signature:
					"intersectObjects(objects: Node[], recursive?: boolean, intersects?: Intersection[]): Intersection[]",
				description:
					"Tests an array of objects. Returns all intersections sorted by distance.",
			},
		],
		threeEquivalent: "THREE.Raycaster",
		divergence: undefined,
	},
	{
		id: "Renderer",
		name: "Renderer",
		category: "Core",
		signature: "new Renderer({ width?, height?, canvas?, pixelRatio? })",
		description:
			"Canvas2D software renderer. Runs the full pipeline each frame: clear, scene traversal, fog cull, painter sort, light bake, rasterize, and framebuffer upload.",
		properties: [
			{
				name: "domElement",
				type: "HTMLCanvasElement|undefined",
				description: "The managed canvas element (read-only).",
			},
			{
				name: "width",
				type: "number",
				description: "Framebuffer width in pixels. Default 300.",
			},
			{
				name: "height",
				type: "number",
				description: "Framebuffer height in pixels. Default 150.",
			},
			{
				name: "pixelRatio",
				type: "number",
				description: "Device pixel ratio. Default 1.",
			},
		],
		methods: [
			{
				name: "render",
				signature: "render(scene: Scene, camera: Camera): void",
				description:
					"Runs the full rendering pipeline and uploads the result to the canvas.",
			},
			{
				name: "setSize",
				signature: "setSize(width: number, height: number): void",
				description: "Resizes the canvas and internal framebuffer.",
			},
			{
				name: "setPixelRatio",
				signature: "setPixelRatio(ratio: number): void",
				description: "Updates the device pixel ratio.",
			},
			{
				name: "setClearColor",
				signature:
					"setClearColor(color: Color | number) | setClearColor(r: number, g: number, b: number): void",
				description:
					"Sets the background clear color. Accepts a Color instance, hex number, or three r/g/b integers. Overridden by fog color when the scene has fog.",
			},
			{
				name: "dispose",
				signature: "dispose(): void",
				description: "Releases internal resources.",
			},
		],
		threeEquivalent: "THREE.WebGLRenderer",
		divergence:
			"Canvas2D software renderer, not WebGL. Constructor takes an options object. setClearColor takes separate r/g/b, not a Color.",
	},

	// ── Cameras ───────────────────────────────────────────────────────────────
	{
		id: "PerspectiveCamera",
		name: "PerspectiveCamera",
		category: "Cameras",
		signature:
			"new PerspectiveCamera({ fov?, aspect?, near?, far?, tileSize? })",
		description:
			"Perspective projection camera. Produces non-unit W values that make affine UV interpolation visibly incorrect - the classic RuneTek 3 artifact.",
		properties: [
			{
				name: "fov",
				type: "number",
				description: "Vertical field of view in degrees. Default 45.",
			},
			{
				name: "aspect",
				type: "number",
				description: "Viewport width / height. Default 1.",
			},
			{
				name: "near",
				type: "number",
				description: "Near clipping plane. Default 0.1.",
			},
			{
				name: "far",
				type: "number",
				description: "Far clipping plane. Default 2000.",
			},
			{
				name: "tileSize",
				type: "number",
				description:
					"World units per tile, used for painter-sort distance and fog culling.",
			},
			{
				name: "projectionMatrix",
				type: "Matrix4",
				description: "Current projection matrix.",
			},
			{
				name: "matrixWorldInverse",
				type: "Matrix4",
				description: "Inverse of the world matrix, updated each frame.",
			},
		],
		methods: [
			{
				name: "updateProjectionMatrix",
				signature: "updateProjectionMatrix(): void",
				description:
					"Rebuilds projectionMatrix from fov, aspect, near, and far. Call after changing any of those properties.",
			},
		],
		threeEquivalent: "THREE.PerspectiveCamera",
		divergence:
			"Constructor takes a single options object, not positional parameters.",
	},
	{
		id: "OrthographicCamera",
		name: "OrthographicCamera",
		category: "Cameras",
		signature:
			"new OrthographicCamera({ left?, right?, top?, bottom?, near?, far?, tileSize? })",
		description:
			"Orthographic projection camera. Produces unit W, so affine UV mapping is exact - no visible RuneTek 3 warping.",
		properties: [
			{
				name: "left",
				type: "number",
				description: "Left frustum boundary. Default -1.",
			},
			{
				name: "right",
				type: "number",
				description: "Right frustum boundary. Default 1.",
			},
			{
				name: "top",
				type: "number",
				description: "Top frustum boundary. Default 1.",
			},
			{
				name: "bottom",
				type: "number",
				description: "Bottom frustum boundary. Default -1.",
			},
			{
				name: "near",
				type: "number",
				description: "Near clipping plane. Default 0.1.",
			},
			{
				name: "far",
				type: "number",
				description: "Far clipping plane. Default 2000.",
			},
			{
				name: "tileSize",
				type: "number",
				description:
					"World units per tile, used for painter-sort distance and fog culling.",
			},
			{
				name: "projectionMatrix",
				type: "Matrix4",
				description: "Current projection matrix.",
			},
			{
				name: "matrixWorldInverse",
				type: "Matrix4",
				description: "Inverse of the world matrix, updated each frame.",
			},
		],
		methods: [
			{
				name: "updateProjectionMatrix",
				signature: "updateProjectionMatrix(): void",
				description:
					"Rebuilds projectionMatrix from the frustum boundaries. Call after changing left/right/top/bottom/near/far.",
			},
		],
		threeEquivalent: "THREE.OrthographicCamera",
		divergence:
			"Constructor takes a single options object. tileSize has no THREE equivalent.",
	},

	// ── Geometry ──────────────────────────────────────────────────────────────
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

	// ── Materials ─────────────────────────────────────────────────────────────
	{
		id: "Material",
		name: "Material",
		category: "Materials",
		signature: "new Material({ layer?, opacity?, shading?, side? })",
		description:
			"Base material. All materials share the layer, opacity, shading, and side properties. Not intended to be used directly - use a subclass.",
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
					"Discrete translucency: 0 = fully opaque, 8 = nearly transparent. Nine fixed steps.",
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
		threeEquivalent: "THREE.Material",
		divergence:
			"opacity is a 0–8 integer (nine discrete steps), not a 0–1 float. No transparent boolean. layer has no THREE equivalent.",
	},
	{
		id: "BasicMaterial",
		name: "BasicMaterial",
		category: "Materials",
		signature:
			"new BasicMaterial({ color?, map?, layer?, opacity?, shading?, side? })",
		description:
			"Solid color or textured material with no lighting. Defaults to Shading.Flat.",
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
					"Optional texture map. When set, overrides color per-pixel.",
			},
		],
		methods: [],
		threeEquivalent: "THREE.MeshBasicMaterial",
		divergence: "Accepts hex number, CSS string, or Color instance for color.",
	},
	{
		id: "LambertMaterial",
		name: "LambertMaterial",
		category: "Materials",
		signature:
			"new LambertMaterial({ color?, map?, layer?, opacity?, shading?, side? })",
		description:
			"Diffuse lighting material. Receives contributions from all scene lights. Defaults to Shading.Gouraud (per-vertex, interpolated across faces).",
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
		threeEquivalent: "THREE.MeshLambertMaterial",
		divergence:
			"Gouraud shading is per-vertex on the CPU - no fragment-shader interpolation.",
	},
	{
		id: "ToonMaterial",
		name: "ToonMaterial",
		category: "Materials",
		signature:
			"new ToonMaterial({ color?, gradientMap?, layer?, opacity?, side? })",
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
		threeEquivalent: "THREE.MeshToonMaterial",
		divergence:
			"Shading is always Gouraud (Flat is not supported). Color quantisation is HSL16, not a generic ramp.",
	},
	{
		id: "LineMaterial",
		name: "LineMaterial",
		category: "Materials",
		signature: "new LineMaterial({ color?, linewidth?, layer?, opacity? })",
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
		threeEquivalent: "THREE.LineBasicMaterial",
		divergence: undefined,
	},
	{
		id: "DashedLineMaterial",
		name: "DashedLineMaterial",
		category: "Materials",
		signature:
			"new DashedLineMaterial({ color?, linewidth?, dashSize?, gapSize?, layer?, opacity? })",
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
		threeEquivalent: "THREE.LineDashedMaterial",
		divergence: undefined,
	},
	{
		id: "PointsMaterial",
		name: "PointsMaterial",
		category: "Materials",
		signature: "new PointsMaterial({ color?, size?, map?, layer?, opacity? })",
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
		threeEquivalent: "THREE.PointsMaterial",
		divergence: undefined,
	},

	// ── Lights ────────────────────────────────────────────────────────────────
	{
		id: "Light",
		name: "Light",
		category: "Lights",
		signature: "new Light(color?, intensity?)",
		description:
			"Abstract base class for all scene lights. Not intended to be used directly - use a subclass like AmbientLight or DirectionalLight.",
		properties: [
			{
				name: "color",
				type: "Color",
				description: "Light color. Default 0xffffff.",
			},
			{
				name: "intensity",
				type: "number",
				description: "Brightness multiplier. Default 1.",
			},
		],
		methods: [],
		threeEquivalent: "THREE.Light",
		divergence: undefined,
	},
	{
		id: "AmbientLight",
		name: "AmbientLight",
		category: "Lights",
		signature: "new AmbientLight(color?, intensity?)",
		description:
			"Adds flat, scene-wide brightness to all vertices uniformly regardless of surface normal or position.",
		properties: [
			{
				name: "color",
				type: "Color",
				description: "Light color. Default 0xffffff.",
			},
			{
				name: "intensity",
				type: "number",
				description: "Brightness multiplier. Default 1.",
			},
		],
		methods: [],
		threeEquivalent: "THREE.AmbientLight",
		divergence: undefined,
	},
	{
		id: "DirectionalLight",
		name: "DirectionalLight",
		category: "Lights",
		signature: "new DirectionalLight(color?, intensity?)",
		description:
			"Directional light. Direction is derived from position or from a target node when set. Shading is per-face (Flat) or per-vertex (Gouraud) depending on the material. No shadows.",
		properties: [
			{
				name: "color",
				type: "Color",
				description: "Light color. Default 0xffffff.",
			},
			{
				name: "intensity",
				type: "number",
				description: "Brightness multiplier. Default 1.",
			},
			{
				name: "position",
				type: "Vector3",
				description:
					"World position from which direction is computed. Default (0, 1, 0).",
			},
			{
				name: "target",
				type: "Node|undefined",
				description:
					"When set, direction is computed as normalize(target.worldPosition - light.worldPosition). Default undefined.",
			},
		],
		methods: [],
		threeEquivalent: "THREE.DirectionalLight",
		divergence:
			"No shadow support. Target is optional - falls back to deriving direction from position when unset.",
	},
	{
		id: "HemisphereLight",
		name: "HemisphereLight",
		category: "Lights",
		signature: "new HemisphereLight(skyColor?, groundColor?, intensity?)",
		description:
			"Sky/ground gradient light evaluated against world Y-axis normals per vertex. Pixels facing up receive skyColor; pixels facing down receive groundColor.",
		properties: [
			{
				name: "color",
				type: "Color",
				description:
					"Sky color (color property inherited from Light). Default 0xffffff.",
			},
			{
				name: "groundColor",
				type: "Color",
				description: "Ground color. Default 0xffffff.",
			},
			{
				name: "intensity",
				type: "number",
				description: "Brightness multiplier. Default 1.",
			},
		],
		methods: [],
		threeEquivalent: "THREE.HemisphereLight",
		divergence: undefined,
	},
	{
		id: "PointLight",
		name: "PointLight",
		category: "Lights",
		signature: "new PointLight(color?, intensity?, distance?, decay?)",
		description:
			"Omnidirectional point light with distance-based attenuation, computed per vertex on the CPU.",
		properties: [
			{
				name: "color",
				type: "Color",
				description: "Light color. Default 0xffffff.",
			},
			{
				name: "intensity",
				type: "number",
				description: "Brightness multiplier. Default 1.",
			},
			{
				name: "distance",
				type: "number",
				description: "Attenuation radius. 0 means no limit. Default 0.",
			},
			{
				name: "decay",
				type: "number",
				description:
					"Attenuation exponent. Default 2 (physically-based falloff).",
			},
		],
		methods: [],
		threeEquivalent: "THREE.PointLight",
		divergence: "No shadow support.",
	},
	{
		id: "SpotLight",
		name: "SpotLight",
		category: "Lights",
		signature:
			"new SpotLight(color?, intensity?, distance?, angle?, penumbra?, decay?)",
		description:
			"Cone-shaped spot light with distance and angular attenuation, computed per vertex on the CPU.",
		properties: [
			{
				name: "color",
				type: "Color",
				description: "Light color. Default 0xffffff.",
			},
			{
				name: "intensity",
				type: "number",
				description: "Brightness multiplier. Default 1.",
			},
			{
				name: "distance",
				type: "number",
				description: "Attenuation radius. 0 means no limit. Default 0.",
			},
			{
				name: "angle",
				type: "number",
				description: "Half-angle of the cone in radians. Default Math.PI / 3.",
			},
			{
				name: "penumbra",
				type: "number",
				description: "Soft-edge fraction [0–1]. Default 0.",
			},
			{
				name: "decay",
				type: "number",
				description: "Attenuation exponent. Default 2.",
			},
			{
				name: "target",
				type: "Node|undefined",
				description:
					"When set, cone direction is computed as normalize(target.worldPosition - light.worldPosition). Default undefined.",
			},
		],
		methods: [],
		threeEquivalent: "THREE.SpotLight",
		divergence:
			"No shadow support. Target is optional - falls back to the direction property when unset.",
	},

	// ── Objects ───────────────────────────────────────────────────────────────
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
		threeEquivalent: "THREE.Mesh",
		divergence: undefined,
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
		threeEquivalent: "THREE.Group",
		divergence: undefined,
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
		threeEquivalent: "THREE.Line",
		divergence: undefined,
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
		threeEquivalent: "THREE.LineLoop",
		divergence: undefined,
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
		threeEquivalent: "THREE.LineSegments",
		divergence: undefined,
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
		threeEquivalent: "THREE.Points",
		divergence: undefined,
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
		threeEquivalent: "THREE.Bone",
		divergence: undefined,
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
		threeEquivalent: "THREE.Skeleton",
		divergence: undefined,
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
		threeEquivalent: "THREE.SkinnedMesh",
		divergence: undefined,
	},
	{
		id: "InstancedMesh",
		name: "InstancedMesh",
		category: "Objects",
		signature: "new InstancedMesh(geometry?, material?, count?)",
		description:
			"Renders multiple instances of the same geometry/material pair with per-instance transforms and optional per-instance colors.",
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
		threeEquivalent: "THREE.InstancedMesh",
		divergence: undefined,
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
		threeEquivalent: "THREE.Sprite",
		divergence: undefined,
	},

	// ── Animation ─────────────────────────────────────────────────────────────
	{
		id: "Animator",
		name: "Animator",
		category: "Animation",
		signature: "new Animator(root: Node)",
		description:
			"Manages AnimationActions on a root Node. Call update(delta) each frame to advance all enabled actions and apply blended property values.",
		properties: [
			{
				name: "root",
				type: "object",
				description: "The root Node passed at construction.",
			},
			{
				name: "time",
				type: "number",
				description: "Total accumulated time in seconds.",
			},
		],
		methods: [
			{
				name: "clipAction",
				signature: "clipAction(clip: AnimationClip): AnimationAction",
				description:
					"Finds or creates an AnimationAction for the given clip and returns it.",
			},
			{
				name: "existingAction",
				signature:
					"existingAction(clip: AnimationClip): AnimationAction|undefined",
				description:
					"Returns an existing action without creating one, or undefined.",
			},
			{
				name: "update",
				signature: "update(delta: number): void",
				description:
					"Advances all enabled actions by delta seconds and applies the blended result to the scene graph.",
			},
			{
				name: "stopAllAction",
				signature: "stopAllAction(): void",
				description: "Stops and disables all actions.",
			},
			{
				name: "uncacheClip",
				signature: "uncacheClip(clip: AnimationClip): void",
				description: "Removes all actions and bindings for the given clip.",
			},
		],
		threeEquivalent: "THREE.AnimationMixer",
		divergence: "Constructor takes the root node directly rather than a scene.",
	},
	{
		id: "AnimationClip",
		name: "AnimationClip",
		category: "Animation",
		signature: "new AnimationClip(name?, duration?, tracks?)",
		description:
			"Named collection of keyframe tracks representing one animation sequence. Duration is auto-computed from tracks when passed as -1.",
		properties: [
			{
				name: "name",
				type: "string",
				description: "Clip name used for lookup.",
			},
			{ name: "duration", type: "number", description: "Length in seconds." },
			{
				name: "tracks",
				type: "Track[]",
				description: "Keyframe tracks this clip contains.",
			},
		],
		methods: [
			{
				name: "findByName",
				signature:
					"AnimationClip.findByName(clips: AnimationClip[], name: string): AnimationClip|undefined",
				description:
					"Static helper. Returns the first clip with the given name.",
			},
			{
				name: "resetDuration",
				signature: "resetDuration(): void",
				description:
					"Recomputes duration from the maximum keyframe time across all tracks.",
			},
			{
				name: "trim",
				signature: "trim(): void",
				description: "Removes keyframes outside [0, duration] from all tracks.",
			},
			{
				name: "optimize",
				signature: "optimize(): void",
				description:
					"Removes redundant keyframes where the value does not change from the previous key.",
			},
		],
		threeEquivalent: "THREE.AnimationClip",
		divergence: undefined,
	},
	{
		id: "AnimationAction",
		name: "AnimationAction",
		category: "Animation",
		signature: "new AnimationAction(clip: AnimationClip, localRoot?)",
		description:
			"Playback state for a single AnimationClip. Controls play/stop, looping, weight, and cross-fading. Typically created via Animator.clipAction().",
		properties: [
			{
				name: "enabled",
				type: "boolean",
				description: "Whether this action is actively advancing. Default true.",
			},
			{
				name: "weight",
				type: "number",
				description: "Blend weight [0–1]. Default 1.",
			},
			{
				name: "timeScale",
				type: "number",
				description: "Playback rate multiplier. Default 1.",
			},
			{
				name: "time",
				type: "number",
				description: "Current playback position in seconds.",
			},
			{
				name: "loop",
				type: "number",
				description:
					"LoopOnce | LoopRepeat | LoopPingPong. Default LoopRepeat.",
			},
			{
				name: "repetitions",
				type: "number",
				description: "Maximum repetitions before stopping. Default Infinity.",
			},
			{
				name: "clampWhenFinished",
				type: "boolean",
				description:
					"When true and LoopOnce, the action freezes at the last frame instead of stopping. Default false.",
			},
			{
				name: "paused",
				type: "boolean",
				description:
					"Suspends time advancement without disabling the action. Default false.",
			},
			{
				name: "clip",
				type: "AnimationClip",
				description: "The clip this action plays.",
			},
		],
		methods: [
			{
				name: "play",
				signature: "play(): this",
				description: "Enables the action.",
			},
			{
				name: "stop",
				signature: "stop(): this",
				description: "Disables the action and resets time to 0.",
			},
			{
				name: "reset",
				signature: "reset(): this",
				description: "Resets time to 0 and re-enables the action.",
			},
			{
				name: "setLoop",
				signature: "setLoop(mode: number, repetitions: number): this",
				description: "Sets the loop mode and repetition count.",
			},
			{
				name: "fadeIn",
				signature: "fadeIn(duration: number): this",
				description: "Animates weight from 0 to 1 over duration seconds.",
			},
			{
				name: "fadeOut",
				signature: "fadeOut(duration: number): this",
				description: "Animates weight from 1 to 0 over duration seconds.",
			},
			{
				name: "crossFadeFrom",
				signature:
					"crossFadeFrom(fadeOutAction: AnimationAction, duration: number): this",
				description: "Fades out another action while this one fades in.",
			},
		],
		threeEquivalent: "THREE.AnimationAction",
		divergence: undefined,
	},
	{
		id: "Track",
		name: "Track",
		category: "Animation",
		signature:
			"new Track(name: string, times: Float32Array | number[], values: Float32Array | number[], itemSize?)",
		description:
			"Base keyframe track. Stores a flat sequence of timed values and linearly interpolates between keyframes. itemSize defines how many floats make up one keyframe value.",
		properties: [
			{
				name: "name",
				type: "string",
				description: 'Property path this track drives, e.g. "position.x".',
			},
			{
				name: "times",
				type: "Float32Array",
				description: "Keyframe timestamps in seconds.",
			},
			{
				name: "values",
				type: "Float32Array",
				description: "Flat keyframe values - itemSize floats per keyframe.",
			},
			{
				name: "itemSize",
				type: "number",
				description: "Number of floats per keyframe. Default 1.",
			},
		],
		methods: [
			{
				name: "getValueAtTime",
				signature: "getValueAtTime(time: number): number[]",
				description:
					"Returns linearly interpolated values at the given time via binary search.",
			},
			{
				name: "interpolate",
				signature:
					"interpolate(index: number, t0: number, t: number, t1: number): number[]",
				description:
					"Linearly interpolates between keyframe at index and index+1.",
			},
		],
		threeEquivalent: "THREE.KeyframeTrack",
		divergence:
			"All tracks are keyframe-based. No separate NumberKeyframeTrack/VectorKeyframeTrack subclasses.",
	},

	// ── Textures ──────────────────────────────────────────────────────────────
	{
		id: "Texture",
		name: "Texture",
		category: "Textures",
		signature: "new Texture(image?)",
		description:
			"Image-backed texture clamped to a 128×128 maximum. Set needsUpdate = true after assigning an image to trigger nearest-neighbor downsampling and pixel caching.",
		properties: [
			{
				name: "id",
				type: "number",
				description: "Auto-incrementing unique identifier.",
			},
			{ name: "name", type: "string", description: "Optional display name." },
			{
				name: "image",
				type: "HTMLImageElement|HTMLCanvasElement|ImageBitmap|undefined",
				description: "Source image.",
			},
			{
				name: "needsUpdate",
				type: "boolean",
				description:
					"Setting to true triggers clamp-and-cache. Required before the texture is usable.",
			},
			{
				name: "data",
				type: "ImageData|undefined",
				description: "Cached pixel data, clamped to ≤128×128 (read-only).",
			},
			{
				name: "width",
				type: "number",
				description: "Width of cached pixel data.",
			},
			{
				name: "height",
				type: "number",
				description: "Height of cached pixel data.",
			},
		],
		methods: [
			{
				name: "clone",
				signature: "clone(): Texture",
				description: "Returns a new Texture sharing the same image reference.",
			},
			{
				name: "dispose",
				signature: "dispose(): void",
				description: "Clears the image and cached pixel data.",
			},
		],
		threeEquivalent: "THREE.Texture",
		divergence:
			"Hard 128×128 cap - larger images are nearest-neighbor downsampled on needsUpdate. No GPU upload; pixel data lives in a plain ImageData.",
	},
	{
		id: "CanvasTexture",
		name: "CanvasTexture",
		category: "Textures",
		signature: "new CanvasTexture(canvas: HTMLCanvasElement)",
		description:
			"Texture sourced from a canvas element. Automatically triggers the needsUpdate path on construction, so the canvas contents are immediately available.",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.CanvasTexture",
		divergence: undefined,
	},
	{
		id: "DataTexture",
		name: "DataTexture",
		category: "Textures",
		signature:
			"new DataTexture(data: Uint8ClampedArray, width: number, height: number)",
		description:
			"Texture created directly from raw RGBA pixel data. Bypasses the needsUpdate / clamp-and-cache path - the ImageData is stored as-is.",
		properties: [
			{
				name: "data",
				type: "ImageData|undefined",
				description:
					"The raw ImageData wrapping the provided Uint8ClampedArray.",
			},
			{ name: "width", type: "number", description: "Width in pixels." },
			{ name: "height", type: "number", description: "Height in pixels." },
		],
		methods: [],
		threeEquivalent: "THREE.DataTexture",
		divergence:
			"CPU renderer reads pixel data directly each frame. No GPU upload step, so changes to the underlying array are reflected immediately without needsUpdate.",
	},
	{
		id: "FramebufferTexture",
		name: "FramebufferTexture",
		category: "Textures",
		signature: "new FramebufferTexture(width: number, height: number)",
		description:
			"CPU render-to-texture. Captures a rectangular region of the current framebuffer for use in a subsequent draw pass.",
		properties: [
			{
				name: "width",
				type: "number",
				description: "Capture width in pixels.",
			},
			{
				name: "height",
				type: "number",
				description: "Capture height in pixels.",
			},
			{
				name: "data",
				type: "ImageData|undefined",
				description: "Captured pixel data (read-only).",
			},
		],
		methods: [
			{
				name: "capture",
				signature: "capture(source: ImageData, x?: number, y?: number): void",
				description:
					"Copies a width x height region from the framebuffer ImageData starting at (x, y).",
			},
			{
				name: "dispose",
				signature: "dispose(): void",
				description: "Clears the captured data.",
			},
		],
		threeEquivalent: "THREE.FramebufferTexture",
		divergence:
			"CPU-side capture via ImageData, not a GPU framebuffer object. Requires an explicit capture() call.",
	},
	{
		id: "VideoTexture",
		name: "VideoTexture",
		category: "Textures",
		signature: "new VideoTexture(video: HTMLVideoElement)",
		description:
			"Texture sourced from an HTMLVideoElement. Auto-updates each frame via the renderer when autoUpdate is true (the default).",
		properties: [
			{
				name: "autoUpdate",
				type: "boolean",
				description:
					"When true, the renderer calls update() automatically each frame. Default true.",
			},
		],
		methods: [
			{
				name: "update",
				signature: "update(): void",
				description:
					"Sets needsUpdate = true when the video's readyState indicates a current frame is available. Called automatically when autoUpdate is true.",
			},
		],
		threeEquivalent: "THREE.VideoTexture",
		divergence: undefined,
	},

	// ── Scene ─────────────────────────────────────────────────────────────────
	{
		id: "Fog",
		name: "Fog",
		category: "Scene",
		signature: "new Fog({ color?, near?, far? })",
		description:
			"Linear depth fog. Blends fragment colors toward a configurable color based on camera-space depth. Objects at near are unaffected; objects at far are fully fogged.",
		properties: [
			{
				name: "color",
				type: "Color",
				description:
					"Fog color. Defaults to black (0x000000). Also used as the framebuffer clear color.",
			},
			{
				name: "near",
				type: "number",
				description: "World-unit distance where fog starts. Default 1.",
			},
			{
				name: "far",
				type: "number",
				description:
					"World-unit distance where fog reaches full density. Default 100.",
			},
		],
		methods: [
			{
				name: "clone",
				signature: "clone(): Fog",
				description: "Returns a new Fog with the same color, near, and far.",
			},
		],
		threeEquivalent: "THREE.Fog",
		divergence:
			"Constructor takes an options object { color, near, far }, not positional parameters.",
	},

	// ── Controls ──────────────────────────────────────────────────────────────
	{
		id: "OrbitControls",
		name: "OrbitControls",
		category: "Controls",
		signature: "new OrbitControls(camera: Camera, domElement: HTMLElement)",
		description:
			"Pointer-driven orbit controls. Left-drag rotates, scroll zooms, right-drag pans. Dispatches change, start, and end events.",
		properties: [
			{
				name: "camera",
				type: "Camera",
				description: "The camera being controlled.",
			},
			{
				name: "domElement",
				type: "HTMLElement",
				description: "The element that receives pointer events.",
			},
			{
				name: "target",
				type: "Vector3",
				description: "World-space point the camera orbits around.",
			},
			{
				name: "enabled",
				type: "boolean",
				description: "When false, all interaction is ignored.",
			},
			{
				name: "enableRotate",
				type: "boolean",
				description: "Whether left-drag rotation is active.",
			},
			{
				name: "enableZoom",
				type: "boolean",
				description: "Whether scroll-wheel zoom is active.",
			},
			{
				name: "enablePan",
				type: "boolean",
				description: "Whether right-drag panning is active.",
			},
			{
				name: "rotateSpeed",
				type: "number",
				description: "Rotation sensitivity multiplier. Default 1.",
			},
			{
				name: "zoomSpeed",
				type: "number",
				description: "Zoom sensitivity multiplier. Default 1.",
			},
			{
				name: "panSpeed",
				type: "number",
				description: "Pan sensitivity multiplier. Default 1.",
			},
			{
				name: "minDistance",
				type: "number",
				description: "Minimum orbital radius. Default 0.",
			},
			{
				name: "maxDistance",
				type: "number",
				description: "Maximum orbital radius. Default Infinity.",
			},
			{
				name: "minPolarAngle",
				type: "number",
				description: "Minimum polar angle in radians (0 = top). Default 0.",
			},
			{
				name: "maxPolarAngle",
				type: "number",
				description:
					"Maximum polar angle in radians (Math.PI = bottom). Default Math.PI.",
			},
			{
				name: "enableDamping",
				type: "boolean",
				description: "When true, movements decelerate smoothly.",
			},
			{
				name: "dampingFactor",
				type: "number",
				description:
					"Fraction of velocity lost per frame when damping is enabled. Default 0.05.",
			},
			{
				name: "autoRotate",
				type: "boolean",
				description:
					"When true, the camera orbits automatically. Default false.",
			},
			{
				name: "autoRotateSpeed",
				type: "number",
				description: "Auto-rotation speed in degrees per second. Default 2.",
			},
			{
				name: "screenSpacePanning",
				type: "boolean",
				description:
					"When true, panning moves in screen space. When false, panning moves in the camera's local plane. Default true.",
			},
		],
		methods: [
			{
				name: "update",
				signature: "update(): boolean",
				description:
					"Applies pending rotation, zoom, and pan then repositions the camera. Must be called each frame. Returns true when the camera moved.",
			},
			{
				name: "reset",
				signature: "reset(): void",
				description:
					"Restores camera position and target to their values at construction time.",
			},
			{
				name: "dispose",
				signature: "dispose(): void",
				description:
					"Removes all DOM event listeners. Call when the controls are no longer needed.",
			},
		],
		threeEquivalent: "THREE.OrbitControls",
		divergence:
			"update() returns a boolean indicating whether the camera moved.",
	},

	// ── Helpers ───────────────────────────────────────────────────────────────
	{
		id: "AxesHelper",
		name: "AxesHelper",
		category: "Helpers",
		signature: "new AxesHelper(size?)",
		description:
			"Displays the three coordinate axes as RGB line segments: X red, Y green, Z blue.",
		properties: [
			{
				name: "geometry",
				type: "Geometry",
				description:
					"Line geometry with six vertices (origin → tip for each axis).",
			},
		],
		methods: [
			{
				name: "dispose",
				signature: "dispose(): void",
				description: "Disposes the underlying geometry.",
			},
		],
		threeEquivalent: "THREE.AxesHelper",
		divergence: undefined,
	},
	{
		id: "GridHelper",
		name: "GridHelper",
		category: "Helpers",
		signature: "new GridHelper(size?, divisions?, color1?, color2?)",
		description:
			"Ground-plane grid of line segments on the XZ plane. Center lines use color1, division lines use color2.",
		properties: [
			{
				name: "geometry",
				type: "Geometry",
				description: "Line geometry for all grid edges.",
			},
		],
		methods: [
			{
				name: "dispose",
				signature: "dispose(): void",
				description: "Disposes the underlying geometry.",
			},
		],
		threeEquivalent: "THREE.GridHelper",
		divergence: undefined,
	},
	{
		id: "BoxHelper",
		name: "BoxHelper",
		category: "Helpers",
		signature: "new BoxHelper(object, color?)",
		description:
			"Draws a wireframe box around the bounding box of a scene object's geometry. Call update() after the object moves or its geometry changes.",
		properties: [
			{
				name: "geometry",
				type: "Geometry",
				description: "Line geometry representing the 12 box edges.",
			},
		],
		methods: [
			{
				name: "update",
				signature: "update(): void",
				description:
					"Recomputes the wireframe from the object's current boundingBox.",
			},
			{
				name: "setFromObject",
				signature: "setFromObject(object: *): this",
				description:
					"Rebuilds the wireframe from the given object's geometry.boundingBox.",
			},
			{
				name: "dispose",
				signature: "dispose(): void",
				description: "Disposes the underlying geometry.",
			},
		],
		threeEquivalent: "THREE.BoxHelper",
		divergence: undefined,
	},
	{
		id: "DirectionalLightHelper",
		name: "DirectionalLightHelper",
		category: "Helpers",
		signature: "new DirectionalLightHelper(light: DirectionalLight, size?)",
		description:
			"Visualizes a DirectionalLight as a square wireframe plane and a direction line.",
		properties: [],
		methods: [
			{
				name: "update",
				signature: "update(): void",
				description: "Syncs helper position to the light's current position.",
			},
			{
				name: "dispose",
				signature: "dispose(): void",
				description: "Disposes child geometries.",
			},
		],
		threeEquivalent: "THREE.DirectionalLightHelper",
		divergence: undefined,
	},
	{
		id: "PointLightHelper",
		name: "PointLightHelper",
		category: "Helpers",
		signature: "new PointLightHelper(light: PointLight, size?)",
		description:
			"Visualizes a PointLight as a small diamond wireframe at the light's position.",
		properties: [],
		methods: [
			{
				name: "update",
				signature: "update(): void",
				description: "Syncs helper position to the light's current position.",
			},
			{
				name: "dispose",
				signature: "dispose(): void",
				description: "Disposes the underlying geometry.",
			},
		],
		threeEquivalent: "THREE.PointLightHelper",
		divergence: undefined,
	},
	{
		id: "SpotLightHelper",
		name: "SpotLightHelper",
		category: "Helpers",
		signature: "new SpotLightHelper(light: SpotLight)",
		description:
			"Visualizes a SpotLight as an 8-segment wireframe cone sized from the light's angle and distance.",
		properties: [],
		methods: [
			{
				name: "update",
				signature: "update(): void",
				description:
					"Syncs position and orientation, and rebuilds the cone geometry from the light's current angle and distance.",
			},
			{
				name: "dispose",
				signature: "dispose(): void",
				description: "Disposes child geometries.",
			},
		],
		threeEquivalent: "THREE.SpotLightHelper",
		divergence: undefined,
	},

	// ── Math ──────────────────────────────────────────────────────────────────
	{
		id: "Vector3",
		name: "Vector3",
		category: "Math",
		signature: "new Vector3(x?, y?, z?)",
		description:
			"Three-component vector used for positions, directions, and scales. All mutation methods return this for chaining.",
		properties: [
			{ name: "x", type: "number", description: "X component." },
			{ name: "y", type: "number", description: "Y component." },
			{ name: "z", type: "number", description: "Z component." },
			{
				name: "length",
				type: "number",
				description: "Euclidean length (read-only).",
			},
			{
				name: "lengthSq",
				type: "number",
				description: "Squared length (read-only, avoids sqrt).",
			},
		],
		methods: [
			{
				name: "set",
				signature: "set(x: number, y: number, z: number): this",
				description: "Sets all three components.",
			},
			{
				name: "add",
				signature: "add(v: Vector3): this",
				description: "Adds another vector in place.",
			},
			{
				name: "sub",
				signature: "sub(v: Vector3): this",
				description: "Subtracts another vector in place.",
			},
			{
				name: "mul",
				signature: "mul(v: Vector3): this",
				description: "Component-wise multiplication.",
			},
			{
				name: "mulScalar",
				signature: "mulScalar(s: number): this",
				description: "Multiplies all components by a scalar.",
			},
			{
				name: "cross",
				signature: "cross(v: Vector3): this",
				description: "Sets this to the cross product of this and v.",
			},
			{
				name: "dot",
				signature: "dot(v: Vector3): number",
				description: "Returns the dot product with v.",
			},
			{
				name: "normalize",
				signature: "normalize(): this",
				description: "Scales the vector to unit length.",
			},
			{
				name: "distanceTo",
				signature: "distanceTo(v: Vector3): number",
				description: "Returns the Euclidean distance to v.",
			},
			{
				name: "applyMatrix4",
				signature: "applyMatrix4(m: Matrix4): this",
				description: "Transforms this point by a 4x4 matrix (w = 1).",
			},
			{
				name: "clone",
				signature: "clone(): Vector3",
				description: "Returns a new Vector3 with the same components.",
			},
			{
				name: "copy",
				signature: "copy(v: Vector3): this",
				description: "Copies components from another vector.",
			},
		],
		threeEquivalent: "THREE.Vector3",
		divergence:
			"x, y, z are private fields accessed via getters/setters. mul() is multiplyScalar with one argument when passed a scalar.",
	},
	{
		id: "Color",
		name: "Color",
		category: "Math",
		signature: "new Color(color?)",
		description:
			"RGB color stored as linear floats (0–1). Accepts a hex number, CSS string, or another Color. The renderer works internally in HSL16 - use Color as the input/output boundary.",
		properties: [
			{ name: "r", type: "number", description: "Red channel, 0–1." },
			{ name: "g", type: "number", description: "Green channel, 0–1." },
			{ name: "b", type: "number", description: "Blue channel, 0–1." },
			{
				name: "hex",
				type: "number",
				description: "Packed 24-bit integer (read-only).",
			},
			{
				name: "hexString",
				type: "string",
				description: "#rrggbb CSS string (read-only).",
			},
			{
				name: "hsl",
				type: "{ h, s, l }",
				description:
					"HSL representation with all components normalised to 0–1 (read-only).",
			},
		],
		methods: [
			{
				name: "set",
				signature: "set(...args): this",
				description:
					"Sets the color from a hex number, CSS string, or r/g/b triplet.",
			},
			{
				name: "setHSL",
				signature: "setHSL(h: number, s: number, l: number): this",
				description: "Sets from normalised HSL values (0–1).",
			},
			{
				name: "copy",
				signature: "copy(color: Color): this",
				description: "Copies r/g/b from another Color.",
			},
			{
				name: "clone",
				signature: "clone(): Color",
				description: "Returns a new Color with the same values.",
			},
			{
				name: "toRGB",
				signature: "Color.toRGB(color: ColorValue): { r, g, b }",
				description:
					"Static helper. Returns 0–255 integer RGB for any ColorValue.",
			},
			{
				name: "fromHsl16",
				signature: "Color.fromHsl16(value: number): Color",
				description:
					"Static helper. Creates a Color from a packed HSL16 integer.",
			},
		],
		threeEquivalent: "THREE.Color",
		divergence:
			"No color name strings or texture sRGB conversion. Static helpers toRGB and fromHsl16 have no THREE equivalent.",
	},
	{
		id: "Matrix4",
		name: "Matrix4",
		category: "Math",
		signature: "new Matrix4(elements?)",
		description:
			"Column-major 4×4 matrix backed by a Float32Array. Initialises to identity when called with no arguments.",
		properties: [
			{
				name: "elements",
				type: "Float32Array",
				description:
					"Flat 16-element column-major storage (read-only accessor).",
			},
		],
		methods: [
			{
				name: "identity",
				signature: "identity(): this",
				description: "Resets to the identity matrix.",
			},
			{
				name: "copy",
				signature: "copy(m: Matrix4): this",
				description: "Copies elements from another Matrix4.",
			},
			{
				name: "clone",
				signature: "clone(): Matrix4",
				description: "Returns a new Matrix4 with the same elements.",
			},
			{
				name: "compose",
				signature:
					"compose(position: Vector3, q: Quaternion, scale: Vector3): this",
				description:
					"Builds a TRS matrix from position, quaternion, and scale.",
			},
			{
				name: "decompose",
				signature:
					"decompose(position: Vector3, q: Quaternion, scale: Vector3): this",
				description:
					"Extracts position, quaternion, and scale from this matrix.",
			},
			{
				name: "invert",
				signature: "invert(): this",
				description: "Inverts the matrix in place.",
			},
			{
				name: "mul",
				signature: "mul(m: Matrix4): this",
				description: "Post-multiplies this matrix by m.",
			},
			{
				name: "mulMatrices",
				signature: "mulMatrices(a: Matrix4, b: Matrix4): this",
				description: "Sets this to a × b.",
			},
			{
				name: "makePerspective",
				signature:
					"makePerspective(fov: number, aspect: number, near: number, far: number): this",
				description: "Builds a perspective projection matrix from radians fov.",
			},
			{
				name: "makeOrthographic",
				signature:
					"makeOrthographic(left, right, top, bottom, near, far): this",
				description: "Builds an orthographic projection matrix.",
			},
		],
		threeEquivalent: "THREE.Matrix4",
		divergence:
			"multiply() is named mul(). makePerspective takes fov in radians (not degrees) and has a different parameter order than THREE.",
	},
	{
		id: "Vector2",
		name: "Vector2",
		category: "Math",
		signature: "new Vector2(x?, y?)",
		description:
			"Two-component vector used for UV coordinates, 2D positions, and curve points.",
		properties: [
			{ name: "x", type: "number", description: "X component." },
			{ name: "y", type: "number", description: "Y component." },
			{
				name: "length",
				type: "number",
				description: "Euclidean length (read-only).",
			},
			{
				name: "lengthSq",
				type: "number",
				description: "Squared length (read-only).",
			},
		],
		methods: [
			{
				name: "set",
				signature: "set(x: number, y: number): this",
				description: "Sets both components.",
			},
			{
				name: "add",
				signature: "add(v: Vector2): this",
				description: "Adds another vector in place.",
			},
			{
				name: "sub",
				signature: "sub(v: Vector2): this",
				description: "Subtracts another vector in place.",
			},
			{
				name: "mulScalar",
				signature: "mulScalar(s: number): this",
				description: "Multiplies both components by a scalar.",
			},
			{
				name: "normalize",
				signature: "normalize(): this",
				description: "Scales the vector to unit length.",
			},
			{
				name: "dot",
				signature: "dot(v: Vector2): number",
				description: "Returns the dot product with v.",
			},
			{
				name: "cross",
				signature: "cross(v: Vector2): number",
				description: "Returns the 2D cross product (scalar): x*v.y - y*v.x.",
			},
			{
				name: "distanceTo",
				signature: "distanceTo(v: Vector2): number",
				description: "Returns the Euclidean distance to v.",
			},
			{
				name: "min",
				signature: "min(v: Vector2): this",
				description: "Component-wise minimum.",
			},
			{
				name: "max",
				signature: "max(v: Vector2): this",
				description: "Component-wise maximum.",
			},
			{
				name: "lerp",
				signature: "lerp(v: Vector2, alpha: number): this",
				description: "Linear interpolation toward v by alpha.",
			},
			{
				name: "clone",
				signature: "clone(): Vector2",
				description: "Returns a new Vector2 with the same components.",
			},
			{
				name: "copy",
				signature: "copy(v: Vector2): this",
				description: "Copies components from another vector.",
			},
		],
		threeEquivalent: "THREE.Vector2",
		divergence: "mulScalar instead of multiplyScalar.",
	},
	{
		id: "Vector4",
		name: "Vector4",
		category: "Math",
		signature: "new Vector4(x?, y?, z?, w?)",
		description:
			"Four-component vector used for homogeneous coordinates and quaternion storage.",
		properties: [
			{ name: "x", type: "number", description: "X component." },
			{ name: "y", type: "number", description: "Y component." },
			{ name: "z", type: "number", description: "Z component." },
			{ name: "w", type: "number", description: "W component." },
			{
				name: "length",
				type: "number",
				description: "Euclidean length (read-only).",
			},
			{
				name: "lengthSq",
				type: "number",
				description: "Squared length (read-only).",
			},
		],
		methods: [
			{
				name: "set",
				signature: "set(x: number, y: number, z: number, w: number): this",
				description: "Sets all four components.",
			},
			{
				name: "normalize",
				signature: "normalize(): this",
				description: "Scales the vector to unit length.",
			},
			{
				name: "divScalar",
				signature: "divScalar(s: number): this",
				description: "Divides all components by a scalar.",
			},
			{
				name: "clone",
				signature: "clone(): Vector4",
				description: "Returns a new Vector4 with the same components.",
			},
			{
				name: "copy",
				signature: "copy(v: Vector4): this",
				description: "Copies components from another vector.",
			},
		],
		threeEquivalent: "THREE.Vector4",
		divergence: undefined,
	},
	{
		id: "Box2",
		name: "Box2",
		category: "Math",
		signature: "new Box2(min?: Vector2, max?: Vector2)",
		description: "2D axis-aligned bounding box defined by min and max corners.",
		properties: [
			{
				name: "min",
				type: "Vector2",
				description: "Lower-left corner.",
			},
			{
				name: "max",
				type: "Vector2",
				description: "Upper-right corner.",
			},
		],
		methods: [
			{
				name: "set",
				signature: "set(min: Vector2, max: Vector2): this",
				description: "Sets both corners.",
			},
			{
				name: "expandByPoint",
				signature: "expandByPoint(point: Vector2): this",
				description: "Expands the box to include the point.",
			},
			{
				name: "containsPoint",
				signature: "containsPoint(point: Vector2): boolean",
				description: "Returns true if the point is inside the box.",
			},
			{
				name: "intersectsBox",
				signature: "intersectsBox(box: Box2): boolean",
				description: "Returns true if the boxes overlap.",
			},
			{
				name: "getCenter",
				signature: "getCenter(target?: Vector2): Vector2",
				description: "Returns the center point.",
			},
			{
				name: "getSize",
				signature: "getSize(target?: Vector2): Vector2",
				description: "Returns the width/height as a Vector2.",
			},
			{
				name: "clone",
				signature: "clone(): Box2",
				description: "Returns a new Box2 with the same bounds.",
			},
		],
		threeEquivalent: "THREE.Box2",
		divergence: undefined,
	},
	{
		id: "Box3",
		name: "Box3",
		category: "Math",
		signature: "new Box3(min?: Vector3, max?: Vector3)",
		description:
			"3D axis-aligned bounding box. Used for frustum culling, raycasting, and bounding-volume tests.",
		properties: [
			{
				name: "min",
				type: "Vector3",
				description: "Lower corner.",
			},
			{
				name: "max",
				type: "Vector3",
				description: "Upper corner.",
			},
			{
				name: "centre",
				type: "Vector3",
				description: "Center point (read-only getter).",
			},
			{
				name: "size",
				type: "Vector3",
				description: "Width/height/depth (read-only getter).",
			},
			{
				name: "isEmpty",
				type: "boolean",
				description: "True if the box has no volume (read-only).",
			},
		],
		methods: [
			{
				name: "setFromObject",
				signature: "setFromObject(object: Node): this",
				description: "Computes the box from a scene object's geometry.",
			},
			{
				name: "setFromPoints",
				signature: "setFromPoints(points: Vector3[]): this",
				description: "Computes the box enclosing all points.",
			},
			{
				name: "expandByPoint",
				signature: "expandByPoint(point: Vector3): this",
				description: "Expands the box to include the point.",
			},
			{
				name: "containsPoint",
				signature: "containsPoint(point: Vector3): boolean",
				description: "Returns true if the point is inside the box.",
			},
			{
				name: "intersectsBox",
				signature: "intersectsBox(box: Box3): boolean",
				description: "Returns true if the boxes overlap.",
			},
			{
				name: "intersectsSphere",
				signature: "intersectsSphere(sphere: Sphere): boolean",
				description: "Returns true if the box intersects the sphere.",
			},
			{
				name: "clone",
				signature: "clone(): Box3",
				description: "Returns a new Box3 with the same bounds.",
			},
		],
		threeEquivalent: "THREE.Box3",
		divergence:
			"Uses British spelling: centre/getCentre instead of center/getCenter.",
	},
	{
		id: "Cylindrical",
		name: "Cylindrical",
		category: "Math",
		signature: "new Cylindrical(radius?, theta?, y?)",
		description:
			"Cylindrical coordinate representation (radius, angle, height).",
		properties: [
			{ name: "radius", type: "number", description: "Radial distance." },
			{
				name: "theta",
				type: "number",
				description: "Angle around the Y axis in radians.",
			},
			{ name: "y", type: "number", description: "Height." },
		],
		methods: [
			{
				name: "set",
				signature: "set(radius: number, theta: number, y: number): this",
				description: "Sets all three components.",
			},
			{
				name: "setFromVector3",
				signature: "setFromVector3(v: Vector3): this",
				description: "Converts a Cartesian Vector3 to cylindrical coordinates.",
			},
			{
				name: "clone",
				signature: "clone(): Cylindrical",
				description: "Returns a new Cylindrical with the same values.",
			},
		],
		threeEquivalent: "THREE.Cylindrical",
		divergence: undefined,
	},
	{
		id: "Euler",
		name: "Euler",
		category: "Math",
		signature: "new Euler(x?, y?, z?, order?)",
		description:
			"Euler angle rotation with configurable axis order. Synced with Quaternion on Node via onChange callbacks.",
		properties: [
			{
				name: "x",
				type: "number",
				description: "Rotation around X axis in radians.",
			},
			{
				name: "y",
				type: "number",
				description: "Rotation around Y axis in radians.",
			},
			{
				name: "z",
				type: "number",
				description: "Rotation around Z axis in radians.",
			},
			{
				name: "order",
				type: "string",
				description:
					"Axis order: 'XYZ', 'YXZ', 'ZXY', 'ZYX', 'YZX', or 'XZY'. Default 'XYZ'.",
			},
		],
		methods: [
			{
				name: "set",
				signature: "set(x: number, y: number, z: number, order?: string): this",
				description: "Sets rotation angles and optionally the order.",
			},
			{
				name: "setFromQuaternion",
				signature: "setFromQuaternion(q: Quaternion, order?: string): this",
				description: "Derives Euler angles from a quaternion.",
			},
			{
				name: "setFromRotationMatrix",
				signature: "setFromRotationMatrix(m: Matrix4, order?: string): this",
				description: "Derives Euler angles from a rotation matrix.",
			},
			{
				name: "reorder",
				signature: "reorder(newOrder: string): this",
				description:
					"Changes the axis order, recomputing angles to preserve the same rotation.",
			},
			{
				name: "clone",
				signature: "clone(): Euler",
				description: "Returns a new Euler with the same values.",
			},
		],
		threeEquivalent: "THREE.Euler",
		divergence: undefined,
	},
	{
		id: "Frustum",
		name: "Frustum",
		category: "Math",
		signature: "new Frustum()",
		description:
			"Six-plane frustum used for camera frustum culling. Built from a camera's combined projection-view matrix.",
		properties: [
			{
				name: "planes",
				type: "Plane[]",
				description:
					"Six clipping planes: left, right, bottom, top, near, far.",
			},
		],
		methods: [
			{
				name: "setFromProjectionMatrix",
				signature: "setFromProjectionMatrix(m: Matrix4): this",
				description:
					"Extracts six planes from a combined projection-view matrix using the Gribb-Hartmann method.",
			},
			{
				name: "intersectsBox",
				signature: "intersectsBox(box: Box3): boolean",
				description:
					"Returns true if any part of the box is inside the frustum.",
			},
			{
				name: "intersectsSphere",
				signature: "intersectsSphere(sphere: Sphere): boolean",
				description:
					"Returns true if any part of the sphere is inside the frustum.",
			},
			{
				name: "containsPoint",
				signature: "containsPoint(point: Vector3): boolean",
				description: "Returns true if the point is inside all six planes.",
			},
			{
				name: "clone",
				signature: "clone(): Frustum",
				description: "Returns a new Frustum with copied planes.",
			},
		],
		threeEquivalent: "THREE.Frustum",
		divergence: undefined,
	},
	{
		id: "Line3",
		name: "Line3",
		category: "Math",
		signature: "new Line3(start?: Vector3, end?: Vector3)",
		description: "3D line segment defined by start and end points.",
		properties: [
			{
				name: "start",
				type: "Vector3",
				description: "Start point.",
			},
			{
				name: "end",
				type: "Vector3",
				description: "End point.",
			},
			{
				name: "delta",
				type: "Vector3",
				description: "Direction vector from start to end (read-only, cloned).",
			},
			{
				name: "length",
				type: "number",
				description: "Segment length (read-only).",
			},
		],
		methods: [
			{
				name: "at",
				signature: "at(t: number, target?: Vector3): Vector3",
				description: "Returns the point at parameter t along the segment.",
			},
			{
				name: "closestPointToPoint",
				signature:
					"closestPointToPoint(point: Vector3, clampToLine?: boolean, target?: Vector3): Vector3",
				description:
					"Returns the closest point on the segment to the given point.",
			},
			{
				name: "getCenter",
				signature: "getCenter(target?: Vector3): Vector3",
				description: "Returns the midpoint of the segment.",
			},
			{
				name: "clone",
				signature: "clone(): Line3",
				description: "Returns a new Line3 with the same endpoints.",
			},
		],
		threeEquivalent: "THREE.Line3",
		divergence: undefined,
	},
	{
		id: "MathUtils",
		name: "MathUtils",
		category: "Math",
		signature: "MathUtils",
		description:
			"Static math utilities: clamping, angle conversion, power-of-2 checks, and RuneTek-specific helpers like tileDistance and HSL16 packing.",
		properties: [
			{
				name: "EPSILON",
				type: "number",
				description: "Small float threshold for comparisons.",
			},
			{
				name: "TAU",
				type: "number",
				description: "2 * Math.PI.",
			},
			{
				name: "DEG2RAD",
				type: "number",
				description: "Degrees-to-radians conversion factor.",
			},
			{
				name: "RAD2DEG",
				type: "number",
				description: "Radians-to-degrees conversion factor.",
			},
		],
		methods: [
			{
				name: "clamp",
				signature: "clamp(x: number, min: number, max: number): number",
				description: "Clamps x to [min, max].",
			},
			{
				name: "toRadians",
				signature: "toRadians(degrees: number): number",
				description: "Converts degrees to radians.",
			},
			{
				name: "toDegrees",
				signature: "toDegrees(radians: number): number",
				description: "Converts radians to degrees.",
			},
			{
				name: "isPowerOf2",
				signature: "isPowerOf2(n: number): boolean",
				description: "Returns true if n is a power of two.",
			},
			{
				name: "tileDistance",
				signature: "tileDistance(a: Vector3, b: Vector3): number",
				description:
					"Returns the RuneTek tile distance between two points (Chebyshev distance on XZ).",
			},
			{
				name: "packHsl16",
				signature: "packHsl16(h: number, s: number, l: number): number",
				description: "Packs HSL values into a 16-bit integer (6H/3S/7L).",
			},
			{
				name: "unpackHsl16",
				signature:
					"unpackHsl16(value: number): { h: number, s: number, l: number }",
				description: "Unpacks a 16-bit HSL integer to h/s/l components.",
			},
		],
		threeEquivalent: "THREE.MathUtils",
		divergence:
			"Not a class - a plain object. Includes RuneTek-specific helpers: tileDistance, packHsl16, unpackHsl16, fastAtan2. No generateUUID or lerp.",
	},
	{
		id: "Matrix3",
		name: "Matrix3",
		category: "Math",
		signature: "new Matrix3(elements?)",
		description:
			"Column-major 3x3 matrix backed by a Float32Array. Used for normal matrices and 2D transforms.",
		properties: [
			{
				name: "elements",
				type: "Float32Array",
				description: "Flat 9-element column-major storage.",
			},
		],
		methods: [
			{
				name: "identity",
				signature: "identity(): this",
				description: "Resets to the identity matrix.",
			},
			{
				name: "getNormalMatrix",
				signature: "getNormalMatrix(m: Matrix4): this",
				description:
					"Sets this to the transposed inverse of the upper-left 3x3 of the given Matrix4.",
			},
			{
				name: "setFromMatrix4",
				signature: "setFromMatrix4(m: Matrix4): this",
				description: "Copies the upper-left 3x3 from a Matrix4.",
			},
			{
				name: "invert",
				signature: "invert(): this",
				description: "Inverts the matrix in place.",
			},
			{
				name: "mul",
				signature: "mul(m: Matrix3): this",
				description: "Post-multiplies this matrix by m.",
			},
			{
				name: "determinant",
				signature: "determinant(): number",
				description: "Returns the determinant.",
			},
			{
				name: "clone",
				signature: "clone(): Matrix3",
				description: "Returns a new Matrix3 with the same elements.",
			},
		],
		threeEquivalent: "THREE.Matrix3",
		divergence:
			"multiply() is named mul(). Supports compose/decompose for 2D transforms.",
	},
	{
		id: "Plane",
		name: "Plane",
		category: "Math",
		signature: "new Plane(normal?: Vector3, constant?: number)",
		description:
			"3D plane defined by a unit normal and a signed distance from the origin. Normalizes on construction.",
		properties: [
			{
				name: "normal",
				type: "Vector3",
				description: "Plane normal (unit length).",
			},
			{
				name: "constant",
				type: "number",
				description: "Signed distance from the origin along the normal.",
			},
		],
		methods: [
			{
				name: "setFromCoplanarPoints",
				signature:
					"setFromCoplanarPoints(a: Vector3, b: Vector3, c: Vector3): this",
				description: "Defines the plane from three coplanar points.",
			},
			{
				name: "distanceToPoint",
				signature: "distanceToPoint(point: Vector3): number",
				description: "Returns the signed distance from the point to the plane.",
			},
			{
				name: "intersectLine",
				signature:
					"intersectLine(line: Line3, target?: Vector3): Vector3|undefined",
				description:
					"Returns the intersection point with a line segment, or undefined if parallel.",
			},
			{
				name: "intersectsSphere",
				signature: "intersectsSphere(sphere: Sphere): boolean",
				description: "Returns true if the sphere crosses the plane.",
			},
			{
				name: "projectPoint",
				signature: "projectPoint(point: Vector3, target?: Vector3): Vector3",
				description: "Projects a point onto the plane.",
			},
			{
				name: "normalize",
				signature: "normalize(): this",
				description: "Normalizes the plane equation.",
			},
			{
				name: "clone",
				signature: "clone(): Plane",
				description: "Returns a new Plane with the same normal and constant.",
			},
		],
		threeEquivalent: "THREE.Plane",
		divergence: undefined,
	},
	{
		id: "Quaternion",
		name: "Quaternion",
		category: "Math",
		signature: "new Quaternion(x?, y?, z?, w?)",
		description:
			"Unit quaternion for rotation. Synced with Euler on Node via onChange callbacks. All mutation methods return this for chaining.",
		properties: [
			{ name: "x", type: "number", description: "X component." },
			{ name: "y", type: "number", description: "Y component." },
			{ name: "z", type: "number", description: "Z component." },
			{ name: "w", type: "number", description: "W component. Default 1." },
			{
				name: "length",
				type: "number",
				description: "Euclidean length (read-only).",
			},
		],
		methods: [
			{
				name: "set",
				signature: "set(x: number, y: number, z: number, w: number): this",
				description: "Sets all four components.",
			},
			{
				name: "setFromAxisAngle",
				signature: "setFromAxisAngle(axis: Vector3, angle: number): this",
				description: "Sets the quaternion from an axis and rotation angle.",
			},
			{
				name: "setFromEuler",
				signature: "setFromEuler(euler: Euler): this",
				description: "Sets the quaternion from Euler angles.",
			},
			{
				name: "setFromRotationMatrix",
				signature: "setFromRotationMatrix(m: Matrix4): this",
				description: "Extracts the rotation quaternion from a matrix.",
			},
			{
				name: "normalize",
				signature: "normalize(): this",
				description: "Normalizes to unit length.",
			},
			{
				name: "invert",
				signature: "invert(): this",
				description:
					"Conjugates the quaternion (inverts for unit quaternions).",
			},
			{
				name: "premul",
				signature: "premul(q: Quaternion): this",
				description: "Pre-multiplies this quaternion by q.",
			},
			{
				name: "clone",
				signature: "clone(): Quaternion",
				description: "Returns a new Quaternion with the same components.",
			},
		],
		threeEquivalent: "THREE.Quaternion",
		divergence:
			"premul() instead of premultiply(). No slerp instance method - slerp is handled by QuaternionTrack.",
	},
	{
		id: "Ray",
		name: "Ray",
		category: "Math",
		signature: "new Ray(origin?: Vector3, direction?: Vector3)",
		description:
			"Infinite ray defined by an origin point and a direction vector. Used by Raycaster for intersection tests.",
		properties: [
			{
				name: "origin",
				type: "Vector3",
				description: "Ray origin.",
			},
			{
				name: "direction",
				type: "Vector3",
				description:
					"Ray direction (should be unit length). Default (0, 0, -1).",
			},
		],
		methods: [
			{
				name: "set",
				signature: "set(origin: Vector3, direction: Vector3): this",
				description: "Sets origin and direction.",
			},
			{
				name: "at",
				signature: "at(t: number, target?: Vector3): Vector3",
				description: "Returns the point at distance t along the ray.",
			},
			{
				name: "intersectTriangle",
				signature:
					"intersectTriangle(a: Vector3, b: Vector3, c: Vector3, backfaceCulling: boolean, target?: Vector3): Vector3|undefined",
				description:
					"Tests intersection with a triangle. Returns the hit point or undefined.",
			},
			{
				name: "intersectBox3",
				signature:
					"intersectBox3(box: Box3, target?: Vector3): Vector3|undefined",
				description:
					"Tests intersection with an axis-aligned box. Returns the entry point or undefined.",
			},
			{
				name: "intersectSphere",
				signature:
					"intersectSphere(sphere: Sphere, target?: Vector3): Vector3|undefined",
				description:
					"Tests intersection with a sphere. Returns the nearest hit point or undefined.",
			},
			{
				name: "intersectPlane",
				signature:
					"intersectPlane(plane: Plane, target?: Vector3): Vector3|undefined",
				description:
					"Tests intersection with a plane. Returns the hit point or undefined.",
			},
			{
				name: "applyMatrix4",
				signature: "applyMatrix4(m: Matrix4): this",
				description: "Transforms both origin and direction by a 4x4 matrix.",
			},
			{
				name: "clone",
				signature: "clone(): Ray",
				description: "Returns a new Ray with the same origin and direction.",
			},
		],
		threeEquivalent: "THREE.Ray",
		divergence:
			"intersectBox3/intersectsBox3 instead of intersectBox/intersectsBox.",
	},
	{
		id: "Sphere",
		name: "Sphere",
		category: "Math",
		signature: "new Sphere(centre?: Vector3, radius?: number)",
		description:
			"Bounding sphere used for frustum culling and intersection tests.",
		properties: [
			{
				name: "centre",
				type: "Vector3",
				description: "Sphere center.",
			},
			{
				name: "radius",
				type: "number",
				description: "Sphere radius. Default -1 (empty).",
			},
		],
		methods: [
			{
				name: "containsPoint",
				signature: "containsPoint(point: Vector3): boolean",
				description: "Returns true if the point is inside the sphere.",
			},
			{
				name: "distanceToPoint",
				signature: "distanceToPoint(point: Vector3): number",
				description:
					"Returns the distance from the point to the sphere surface (negative if inside).",
			},
			{
				name: "intersectsSphere",
				signature: "intersectsSphere(sphere: Sphere): boolean",
				description: "Returns true if the spheres overlap.",
			},
			{
				name: "translate",
				signature: "translate(offset: Vector3): this",
				description: "Moves the sphere by the given offset.",
			},
			{
				name: "setFromPoints",
				signature:
					"setFromPoints(points: Vector3[], optionalCenter?: Vector3): this",
				description:
					"Computes the bounding sphere from an array of points. Uses the provided center or computes the centroid.",
			},
			{
				name: "expandByPoint",
				signature: "expandByPoint(point: Vector3): this",
				description:
					"Expands the radius to include the point if it lies outside the sphere.",
			},
			{
				name: "clone",
				signature: "clone(): Sphere",
				description: "Returns a new Sphere with the same centre and radius.",
			},
		],
		threeEquivalent: "THREE.Sphere",
		divergence: "Uses British spelling: centre instead of center.",
	},
	{
		id: "Spherical",
		name: "Spherical",
		category: "Math",
		signature: "new Spherical(radius?, phi?, theta?)",
		description:
			"Spherical coordinate representation. Used by OrbitControls for camera positioning.",
		properties: [
			{
				name: "radius",
				type: "number",
				description: "Radial distance.",
			},
			{
				name: "phi",
				type: "number",
				description: "Polar angle from Y axis in radians.",
			},
			{
				name: "theta",
				type: "number",
				description: "Azimuthal angle around Y axis in radians.",
			},
		],
		methods: [
			{
				name: "set",
				signature: "set(radius: number, phi: number, theta: number): this",
				description: "Sets all three components.",
			},
			{
				name: "setFromVector3",
				signature: "setFromVector3(v: Vector3): this",
				description: "Converts a Cartesian Vector3 to spherical coordinates.",
			},
			{
				name: "makeSafe",
				signature: "makeSafe(): this",
				description:
					"Clamps phi to avoid gimbal-lock singularities at the poles.",
			},
			{
				name: "clone",
				signature: "clone(): Spherical",
				description: "Returns a new Spherical with the same values.",
			},
		],
		threeEquivalent: "THREE.Spherical",
		divergence: undefined,
	},
	{
		id: "Triangle",
		name: "Triangle",
		category: "Math",
		signature: "new Triangle(a?: Vector3, b?: Vector3, c?: Vector3)",
		description:
			"Three-vertex triangle with barycentric coordinate helpers, area computation, and intersection tests.",
		properties: [
			{ name: "a", type: "Vector3", description: "First vertex." },
			{ name: "b", type: "Vector3", description: "Second vertex." },
			{ name: "c", type: "Vector3", description: "Third vertex." },
		],
		methods: [
			{
				name: "set",
				signature: "set(a: Vector3, b: Vector3, c: Vector3): this",
				description: "Sets all three vertices.",
			},
			{
				name: "getArea",
				signature: "getArea(): number",
				description: "Returns the area of the triangle.",
			},
			{
				name: "getNormal",
				signature: "getNormal(target?: Vector3): Vector3",
				description: "Returns the face normal (unit length).",
			},
			{
				name: "getBarycoord",
				signature: "getBarycoord(point: Vector3, target?: Vector3): Vector3",
				description:
					"Returns the barycentric coordinates of a point relative to this triangle.",
			},
			{
				name: "containsPoint",
				signature: "containsPoint(point: Vector3): boolean",
				description: "Returns true if the point lies inside the triangle.",
			},
			{
				name: "isFrontFacing",
				signature: "isFrontFacing(direction: Vector3): boolean",
				description: "Returns true if the triangle faces the given direction.",
			},
			{
				name: "closestPointToPoint",
				signature:
					"closestPointToPoint(point: Vector3, target?: Vector3): Vector3",
				description:
					"Returns the closest point on the triangle to the given point.",
			},
			{
				name: "clone",
				signature: "clone(): Triangle",
				description: "Returns a new Triangle with the same vertices.",
			},
		],
		threeEquivalent: "THREE.Triangle",
		divergence: undefined,
	},

	// ── Loaders ──────────────────────────────────────────────────────────────
	{
		id: "Loader",
		name: "Loader",
		category: "Loaders",
		signature: "new Loader(manager?: LoadingManager)",
		description:
			"Abstract base class for all loaders. Provides path, crossOrigin, and request header configuration.",
		properties: [
			{
				name: "manager",
				type: "LoadingManager",
				description: "The LoadingManager this loader reports to.",
			},
			{
				name: "path",
				type: "string",
				description: "Base path prepended to all URLs.",
			},
			{
				name: "crossOrigin",
				type: "string",
				description:
					"Cross-origin attribute value. Defaults to empty string (not 'anonymous').",
			},
			{
				name: "requestHeader",
				type: "Record<string, string>",
				description: "HTTP headers sent with each request.",
			},
		],
		methods: [
			{
				name: "setPath",
				signature: "setPath(path: string): this",
				description: "Sets the base path for URLs.",
			},
			{
				name: "setCrossOrigin",
				signature: "setCrossOrigin(crossOrigin: string): this",
				description: "Sets the cross-origin attribute.",
			},
			{
				name: "setRequestHeader",
				signature: "setRequestHeader(header: Record<string, string>): this",
				description: "Sets HTTP headers for requests.",
			},
			{
				name: "loadAsync",
				signature: "loadAsync(url: string): Promise<*>",
				description: "Promise wrapper around load().",
			},
		],
		threeEquivalent: "THREE.Loader",
		divergence:
			"crossOrigin defaults to empty string, not 'anonymous'. load() is abstract.",
	},
	{
		id: "LoadingManager",
		name: "LoadingManager",
		category: "Loaders",
		signature: "new LoadingManager(onLoad?, onProgress?, onError?)",
		description:
			"Tracks the loading progress of multiple loaders. Fires callbacks when all items finish or when individual items fail.",
		properties: [
			{
				name: "isLoading",
				type: "boolean",
				description: "True while any items are still loading.",
			},
		],
		methods: [
			{
				name: "itemStart",
				signature: "itemStart(url: string): void",
				description: "Registers a new item as loading.",
			},
			{
				name: "itemEnd",
				signature: "itemEnd(url: string): void",
				description:
					"Marks an item as finished. Fires onLoad when all items are done.",
			},
			{
				name: "itemError",
				signature: "itemError(url: string): void",
				description: "Reports a failed item to the onError callback.",
			},
			{
				name: "resolveURL",
				signature: "resolveURL(url: string): string",
				description: "Returns the final URL after path resolution.",
			},
		],
		threeEquivalent: "THREE.LoadingManager",
		divergence: undefined,
	},
	{
		id: "FileLoader",
		name: "FileLoader",
		category: "Loaders",
		signature: "new FileLoader(manager?)",
		description:
			"Loads raw files via fetch(). Supports text, JSON, and ArrayBuffer response types.",
		properties: [],
		methods: [
			{
				name: "setResponseType",
				signature: "setResponseType(type: string): this",
				description:
					"Sets the expected response type: 'text', 'json', or 'arraybuffer'.",
			},
			{
				name: "setMimeType",
				signature: "setMimeType(type: string): this",
				description: "Sets the MIME type sent as the Accept header.",
			},
			{
				name: "load",
				signature:
					"load(url: string, onLoad?: Function, onProgress?: Function, onError?: Function): void",
				description: "Fetches the file and passes the result to onLoad.",
			},
		],
		threeEquivalent: "THREE.FileLoader",
		divergence: undefined,
	},
	{
		id: "TextureLoader",
		name: "TextureLoader",
		category: "Loaders",
		signature: "new TextureLoader(manager?)",
		description:
			"Loads images as Texture instances via ImageBitmapLoader. The loaded texture has needsUpdate already triggered.",
		properties: [],
		methods: [
			{
				name: "load",
				signature:
					"load(url: string, onLoad?: Function, onProgress?: Function, onError?: Function): void",
				description:
					"Loads an image, wraps it in a Texture, and passes it to onLoad.",
			},
		],
		threeEquivalent: "THREE.TextureLoader",
		divergence:
			"Uses ImageBitmapLoader (fetch + createImageBitmap), not HTMLImageElement. This avoids canvas taint from CORS.",
	},
	{
		id: "ImageBitmapLoader",
		name: "ImageBitmapLoader",
		category: "Loaders",
		signature: "new ImageBitmapLoader(manager?)",
		description:
			"Loads images as ImageBitmap via fetch() and createImageBitmap(). Sends Accept: image/* to bypass SPA fallback.",
		properties: [],
		methods: [
			{
				name: "setOptions",
				signature: "setOptions(options: object): this",
				description: "Sets options passed to createImageBitmap().",
			},
			{
				name: "load",
				signature:
					"load(url: string, onLoad?: Function, onProgress?: Function, onError?: Function): void",
				description: "Fetches the image and passes the ImageBitmap to onLoad.",
			},
		],
		threeEquivalent: "THREE.ImageBitmapLoader",
		divergence: undefined,
	},
	{
		id: "ImageLoader",
		name: "ImageLoader",
		category: "Loaders",
		signature: "new ImageLoader(manager?)",
		description:
			"Loads images as HTMLImageElement. Only sets crossOrigin on the image when the value is truthy.",
		properties: [],
		methods: [
			{
				name: "load",
				signature:
					"load(url: string, onLoad?: Function, onProgress?: Function, onError?: Function): void",
				description:
					"Creates an Image element, loads the URL, and passes it to onLoad.",
			},
		],
		threeEquivalent: "THREE.ImageLoader",
		divergence:
			"crossOrigin defaults to empty string. Only set on the image when truthy, unlike THREE which always sets 'anonymous'.",
	},
	{
		id: "GeometryLoader",
		name: "GeometryLoader",
		category: "Loaders",
		signature: "new GeometryLoader(manager?)",
		description:
			"Loads Geometry from JSON files containing attributes and optional index data.",
		properties: [],
		methods: [
			{
				name: "load",
				signature:
					"load(url: string, onLoad?: Function, onProgress?: Function, onError?: Function): void",
				description: "Fetches JSON and passes the parsed Geometry to onLoad.",
			},
			{
				name: "parse",
				signature: "parse(json: object): Geometry",
				description:
					"Parses a JSON object with attributes and optional index into a Geometry.",
			},
		],
		threeEquivalent: "THREE.BufferGeometryLoader",
		divergence: undefined,
	},
	{
		id: "MaterialLoader",
		name: "MaterialLoader",
		category: "Loaders",
		signature: "new MaterialLoader(manager?)",
		description:
			"Loads Material instances from JSON. Supports BasicMaterial, LambertMaterial, and other material types.",
		properties: [],
		methods: [
			{
				name: "load",
				signature:
					"load(url: string, onLoad?: Function, onProgress?: Function, onError?: Function): void",
				description: "Fetches JSON and passes the parsed material to onLoad.",
			},
			{
				name: "parse",
				signature: "parse(json: object): Material",
				description: "Creates a material instance from a JSON descriptor.",
			},
		],
		threeEquivalent: "THREE.MaterialLoader",
		divergence: undefined,
	},
	{
		id: "ObjectLoader",
		name: "ObjectLoader",
		category: "Loaders",
		signature: "new ObjectLoader(manager?)",
		description:
			"Loads scene-graph objects from JSON. Handles Node, Group, and Scene types with recursive child parsing.",
		properties: [],
		methods: [
			{
				name: "load",
				signature:
					"load(url: string, onLoad?: Function, onProgress?: Function, onError?: Function): void",
				description:
					"Fetches JSON and passes the parsed Node hierarchy to onLoad.",
			},
			{
				name: "parse",
				signature: "parse(json: object): Node",
				description: "Parses a JSON scene descriptor into a Node tree.",
			},
		],
		threeEquivalent: "THREE.ObjectLoader",
		divergence: undefined,
	},
	{
		id: "AnimationLoader",
		name: "AnimationLoader",
		category: "Loaders",
		signature: "new AnimationLoader(manager?)",
		description: "Loads AnimationClip arrays from JSON.",
		properties: [],
		methods: [
			{
				name: "load",
				signature:
					"load(url: string, onLoad?: Function, onProgress?: Function, onError?: Function): void",
				description:
					"Fetches JSON and passes the parsed AnimationClip array to onLoad.",
			},
			{
				name: "parse",
				signature: "parse(json: object): AnimationClip[]",
				description: "Parses a JSON array into AnimationClip instances.",
			},
		],
		threeEquivalent: "THREE.AnimationLoader",
		divergence: undefined,
	},
	{
		id: "DataTextureLoader",
		name: "DataTextureLoader",
		category: "Loaders",
		signature: "new DataTextureLoader(manager?)",
		description:
			"Abstract loader for raw pixel data formats. Fetches as ArrayBuffer and delegates to a subclass parse() method.",
		properties: [],
		methods: [
			{
				name: "load",
				signature:
					"load(url: string, onLoad?: Function, onProgress?: Function, onError?: Function): void",
				description:
					"Fetches the URL as an ArrayBuffer, calls parse(), and wraps the result in a DataTexture.",
			},
		],
		threeEquivalent: "THREE.DataTextureLoader",
		divergence:
			"parse() is abstract - subclasses must return { data, width, height }.",
	},

	// ── Animation (additional) ───────────────────────────────────────────────
	{
		id: "AnimationUtils",
		name: "AnimationUtils",
		category: "Animation",
		signature: "AnimationUtils",
		description:
			"Static utilities for manipulating AnimationClips: subclipping and additive blending.",
		properties: [],
		methods: [
			{
				name: "subclip",
				signature:
					"subclip(clip: AnimationClip, name: string, startFrame: number, endFrame: number, fps?: number): AnimationClip",
				description: "Extracts a time range from a clip as a new named clip.",
			},
			{
				name: "makeClipAdditive",
				signature:
					"makeClipAdditive(clip: AnimationClip, referenceFrame?: number, referenceClip?: AnimationClip): AnimationClip",
				description:
					"Converts a clip to additive format relative to a reference frame.",
			},
		],
		threeEquivalent: "THREE.AnimationUtils",
		divergence: undefined,
	},
	{
		id: "Binding",
		name: "Binding",
		category: "Animation",
		signature: "new Binding(root: object, path: string)",
		description:
			"Resolves a dotted property path on a scene-graph node for animation. Reads and writes property values during playback.",
		properties: [
			{
				name: "root",
				type: "object",
				description: "The root object to resolve paths from.",
			},
			{
				name: "path",
				type: "string",
				description: "Dotted property path, e.g. 'position.x' or 'visible'.",
			},
		],
		methods: [
			{
				name: "resolveNode",
				signature: "resolveNode(): object|undefined",
				description: "Resolves the target object from the path.",
			},
			{
				name: "getValue",
				signature: "getValue(targetArray: number[], offset: number): void",
				description: "Reads the current property value into the array.",
			},
			{
				name: "setValue",
				signature: "setValue(sourceArray: number[], offset: number): void",
				description: "Writes a value from the array to the property.",
			},
		],
		threeEquivalent: "THREE.PropertyBinding",
		divergence: undefined,
	},
	{
		id: "PropertyMixer",
		name: "PropertyMixer",
		category: "Animation",
		signature: "new PropertyMixer(binding: Binding, itemSize: number)",
		description:
			"Accumulates and applies weighted animation values for a single property. Used internally by Animator to blend multiple actions.",
		properties: [],
		methods: [
			{
				name: "accumulate",
				signature:
					"accumulate(accuIndex: number, weight: number, values: number[]): void",
				description: "Adds a weighted value contribution to the accumulator.",
			},
			{
				name: "apply",
				signature: "apply(accuIndex: number): void",
				description: "Applies the accumulated value to the bound property.",
			},
			{
				name: "saveOriginalState",
				signature: "saveOriginalState(): void",
				description:
					"Captures the current property value for later restoration.",
			},
			{
				name: "restoreOriginalState",
				signature: "restoreOriginalState(): void",
				description: "Restores the saved property value.",
			},
		],
		threeEquivalent: "THREE.PropertyMixer",
		divergence: undefined,
	},
	{
		id: "BooleanTrack",
		name: "BooleanTrack",
		category: "Animation",
		signature:
			"new BooleanTrack(name: string, times: Float32Array | number[], values: Float32Array | number[])",
		description:
			"Keyframe track for boolean properties. Uses step interpolation (no blending between keyframes).",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.BooleanKeyframeTrack",
		divergence: "Step interpolation only.",
	},
	{
		id: "ColorTrack",
		name: "ColorTrack",
		category: "Animation",
		signature:
			"new ColorTrack(name: string, times: Float32Array | number[], values: Float32Array | number[])",
		description:
			"Keyframe track for RGB color properties (itemSize = 3). Uses linear interpolation.",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.ColorKeyframeTrack",
		divergence: undefined,
	},
	{
		id: "NumberTrack",
		name: "NumberTrack",
		category: "Animation",
		signature:
			"new NumberTrack(name: string, times: Float32Array | number[], values: Float32Array | number[])",
		description:
			"Keyframe track for scalar properties (itemSize = 1). Uses linear interpolation.",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.NumberKeyframeTrack",
		divergence: undefined,
	},
	{
		id: "QuaternionTrack",
		name: "QuaternionTrack",
		category: "Animation",
		signature:
			"new QuaternionTrack(name: string, times: Float32Array | number[], values: Float32Array | number[])",
		description:
			"Keyframe track for quaternion rotations (itemSize = 4). Uses spherical linear interpolation (slerp) with shortest-path correction.",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.QuaternionKeyframeTrack",
		divergence: undefined,
	},
	{
		id: "VectorTrack",
		name: "VectorTrack",
		category: "Animation",
		signature:
			"new VectorTrack(name: string, times: Float32Array | number[], values: Float32Array | number[], itemSize?: number)",
		description:
			"Keyframe track for vector properties. Default itemSize is 3 (Vector3). Uses linear interpolation.",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.VectorKeyframeTrack",
		divergence: undefined,
	},

	// ── Curves ───────────────────────────────────────────────────────────────
	{
		id: "Curve",
		name: "Curve",
		category: "Curves",
		signature: "new Curve()",
		description:
			"Abstract base class for parametric curves. Subclasses implement getPoint(t) to define the curve shape.",
		properties: [
			{
				name: "arcLengthDivisions",
				type: "number",
				description:
					"Number of subdivisions for arc-length parameterization. Default 200.",
			},
		],
		methods: [
			{
				name: "getPoint",
				signature: "getPoint(t: number, target?): Vector2|Vector3",
				description:
					"Returns the point at parameter t in [0, 1]. Abstract - must be overridden.",
			},
			{
				name: "getPointAt",
				signature: "getPointAt(u: number, target?): Vector2|Vector3",
				description: "Returns the point at arc-length fraction u in [0, 1].",
			},
			{
				name: "getPoints",
				signature: "getPoints(divisions?: number): Array",
				description:
					"Returns an array of equi-parameter points along the curve.",
			},
			{
				name: "getSpacedPoints",
				signature: "getSpacedPoints(divisions?: number): Array",
				description: "Returns an array of equidistant points along the curve.",
			},
			{
				name: "getLength",
				signature: "getLength(): number",
				description: "Returns the total arc length of the curve.",
			},
			{
				name: "getTangent",
				signature: "getTangent(t: number, target?): Vector2|Vector3",
				description:
					"Returns the unit tangent at parameter t via finite difference.",
			},
			{
				name: "clone",
				signature: "clone(): Curve",
				description: "Returns a copy of this curve.",
			},
		],
		threeEquivalent: "THREE.Curve",
		divergence: undefined,
	},
	{
		id: "CurvePath",
		name: "CurvePath",
		category: "Curves",
		signature: "new CurvePath()",
		description:
			"Sequence of connected curves that can be sampled as a single path. Optionally auto-closes.",
		properties: [
			{
				name: "curves",
				type: "Curve[]",
				description: "The individual curves in order.",
			},
			{
				name: "autoClose",
				type: "boolean",
				description:
					"When true, a closing line segment is added from the last point to the first.",
			},
		],
		methods: [
			{
				name: "add",
				signature: "add(curve: Curve): void",
				description: "Appends a curve to the path.",
			},
			{
				name: "closePath",
				signature: "closePath(): void",
				description:
					"Adds a LineCurve from the last point back to the first if not already closed.",
			},
			{
				name: "getPoint",
				signature: "getPoint(t: number, target?): Vector2|Vector3",
				description: "Returns the point at parameter t across the full path.",
			},
		],
		threeEquivalent: "THREE.CurvePath",
		divergence: undefined,
	},
	{
		id: "Path",
		name: "Path",
		category: "Curves",
		signature: "new Path(points?: Vector2[])",
		description:
			"2D path built from move/line/arc/bezier commands. Extends CurvePath with drawing-style API.",
		properties: [
			{
				name: "currentPoint",
				type: "Vector2",
				description: "The current pen position.",
			},
		],
		methods: [
			{
				name: "moveTo",
				signature: "moveTo(x: number, y: number): this",
				description: "Moves the pen without drawing.",
			},
			{
				name: "lineTo",
				signature: "lineTo(x: number, y: number): this",
				description: "Draws a line segment to (x, y).",
			},
			{
				name: "quadraticCurveTo",
				signature:
					"quadraticCurveTo(cpX: number, cpY: number, x: number, y: number): this",
				description: "Draws a quadratic Bezier curve.",
			},
			{
				name: "bezierCurveTo",
				signature:
					"bezierCurveTo(cp1X: number, cp1Y: number, cp2X: number, cp2Y: number, x: number, y: number): this",
				description: "Draws a cubic Bezier curve.",
			},
			{
				name: "arc",
				signature:
					"arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, clockwise?: boolean): this",
				description: "Draws a circular arc relative to the current point.",
			},
			{
				name: "ellipse",
				signature:
					"ellipse(x: number, y: number, xR: number, yR: number, startAngle: number, endAngle: number, clockwise?: boolean, rotation?: number): this",
				description: "Draws an elliptical arc relative to the current point.",
			},
		],
		threeEquivalent: "THREE.Path",
		divergence: undefined,
	},
	{
		id: "Shape",
		name: "Shape",
		category: "Curves",
		signature: "new Shape()",
		description:
			"2D shape with optional holes. Extends Path with hole support for use with ShapeGeometry and ExtrudeGeometry.",
		properties: [
			{
				name: "holes",
				type: "Path[]",
				description: "Array of hole paths subtracted from the shape.",
			},
		],
		methods: [
			{
				name: "getPointsHoles",
				signature: "getPointsHoles(divisions: number): Vector2[][]",
				description: "Returns point arrays for each hole.",
			},
			{
				name: "extractPoints",
				signature:
					"extractPoints(divisions: number): { shape: Vector2[], holes: Vector2[][] }",
				description: "Returns points for the outer shape and all holes.",
			},
		],
		threeEquivalent: "THREE.Shape",
		divergence: undefined,
	},
	{
		id: "ShapePath",
		name: "ShapePath",
		category: "Curves",
		signature: "new ShapePath()",
		description:
			"Builds Shape instances from a sequence of move/line/bezier commands. Used by loaders to reconstruct shapes from serialized data.",
		properties: [],
		methods: [
			{
				name: "moveTo",
				signature: "moveTo(x: number, y: number): void",
				description: "Starts a new subpath.",
			},
			{
				name: "lineTo",
				signature: "lineTo(x: number, y: number): void",
				description: "Adds a line segment.",
			},
			{
				name: "toShapes",
				signature: "toShapes(): Shape[]",
				description: "Converts the accumulated subpaths into Shape instances.",
			},
		],
		threeEquivalent: "THREE.ShapePath",
		divergence: undefined,
	},
	{
		id: "EllipseCurve",
		name: "EllipseCurve",
		category: "Curves",
		signature:
			"new EllipseCurve(cx?, cy?, xRadius?, yRadius?, startAngle?, endAngle?, clockwise?, rotation?)",
		description: "2D ellipse or partial elliptical arc centered at (cx, cy).",
		properties: [
			{ name: "cx", type: "number", description: "Center X." },
			{ name: "cy", type: "number", description: "Center Y." },
			{
				name: "xRadius",
				type: "number",
				description: "Horizontal radius.",
			},
			{
				name: "yRadius",
				type: "number",
				description: "Vertical radius.",
			},
			{
				name: "startAngle",
				type: "number",
				description: "Start angle in radians.",
			},
			{
				name: "endAngle",
				type: "number",
				description: "End angle in radians.",
			},
			{
				name: "clockwise",
				type: "boolean",
				description: "Arc direction. Default false.",
			},
			{
				name: "rotation",
				type: "number",
				description: "Rotation of the ellipse in radians. Default 0.",
			},
		],
		methods: [
			{
				name: "getPoint",
				signature: "getPoint(t: number, target?: Vector2): Vector2",
				description: "Returns the point at parameter t.",
			},
		],
		threeEquivalent: "THREE.EllipseCurve",
		divergence: undefined,
	},
	{
		id: "ArcCurve",
		name: "ArcCurve",
		category: "Curves",
		signature:
			"new ArcCurve(cx?, cy?, radius?, startAngle?, endAngle?, clockwise?)",
		description:
			"Circular arc. Shorthand for EllipseCurve with equal x/y radii.",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.ArcCurve",
		divergence: undefined,
	},
	{
		id: "LineCurve",
		name: "LineCurve",
		category: "Curves",
		signature: "new LineCurve(v1?: Vector2, v2?: Vector2)",
		description: "2D line segment between two points.",
		properties: [
			{ name: "v1", type: "Vector2", description: "Start point." },
			{ name: "v2", type: "Vector2", description: "End point." },
		],
		methods: [
			{
				name: "getPoint",
				signature: "getPoint(t: number, target?: Vector2): Vector2",
				description: "Returns the linearly interpolated point at t.",
			},
		],
		threeEquivalent: "THREE.LineCurve",
		divergence: undefined,
	},
	{
		id: "LineCurve3",
		name: "LineCurve3",
		category: "Curves",
		signature: "new LineCurve3(v1?: Vector3, v2?: Vector3)",
		description: "3D line segment between two points.",
		properties: [
			{ name: "v1", type: "Vector3", description: "Start point." },
			{ name: "v2", type: "Vector3", description: "End point." },
		],
		methods: [
			{
				name: "getPoint",
				signature: "getPoint(t: number, target?: Vector3): Vector3",
				description: "Returns the linearly interpolated point at t.",
			},
		],
		threeEquivalent: "THREE.LineCurve3",
		divergence: undefined,
	},
	{
		id: "QuadraticBezierCurve",
		name: "QuadraticBezierCurve",
		category: "Curves",
		signature:
			"new QuadraticBezierCurve(v0?: Vector2, v1?: Vector2, v2?: Vector2)",
		description: "2D quadratic Bezier curve with one control point.",
		properties: [
			{ name: "v0", type: "Vector2", description: "Start point." },
			{
				name: "v1",
				type: "Vector2",
				description: "Control point.",
			},
			{ name: "v2", type: "Vector2", description: "End point." },
		],
		methods: [
			{
				name: "getPoint",
				signature: "getPoint(t: number, target?: Vector2): Vector2",
				description: "Returns the point at parameter t.",
			},
		],
		threeEquivalent: "THREE.QuadraticBezierCurve",
		divergence: undefined,
	},
	{
		id: "QuadraticBezierCurve3",
		name: "QuadraticBezierCurve3",
		category: "Curves",
		signature:
			"new QuadraticBezierCurve3(v0?: Vector3, v1?: Vector3, v2?: Vector3)",
		description: "3D quadratic Bezier curve with one control point.",
		properties: [
			{ name: "v0", type: "Vector3", description: "Start point." },
			{
				name: "v1",
				type: "Vector3",
				description: "Control point.",
			},
			{ name: "v2", type: "Vector3", description: "End point." },
		],
		methods: [
			{
				name: "getPoint",
				signature: "getPoint(t: number, target?: Vector3): Vector3",
				description: "Returns the point at parameter t.",
			},
		],
		threeEquivalent: "THREE.QuadraticBezierCurve3",
		divergence: undefined,
	},
	{
		id: "CubicBezierCurve",
		name: "CubicBezierCurve",
		category: "Curves",
		signature:
			"new CubicBezierCurve(v0?: Vector2, v1?: Vector2, v2?: Vector2, v3?: Vector2)",
		description: "2D cubic Bezier curve with two control points.",
		properties: [
			{ name: "v0", type: "Vector2", description: "Start point." },
			{
				name: "v1",
				type: "Vector2",
				description: "First control point.",
			},
			{
				name: "v2",
				type: "Vector2",
				description: "Second control point.",
			},
			{ name: "v3", type: "Vector2", description: "End point." },
		],
		methods: [
			{
				name: "getPoint",
				signature: "getPoint(t: number, target?: Vector2): Vector2",
				description: "Returns the point at parameter t.",
			},
		],
		threeEquivalent: "THREE.CubicBezierCurve",
		divergence: undefined,
	},
	{
		id: "CubicBezierCurve3",
		name: "CubicBezierCurve3",
		category: "Curves",
		signature:
			"new CubicBezierCurve3(v0?: Vector3, v1?: Vector3, v2?: Vector3, v3?: Vector3)",
		description: "3D cubic Bezier curve with two control points.",
		properties: [
			{ name: "v0", type: "Vector3", description: "Start point." },
			{
				name: "v1",
				type: "Vector3",
				description: "First control point.",
			},
			{
				name: "v2",
				type: "Vector3",
				description: "Second control point.",
			},
			{ name: "v3", type: "Vector3", description: "End point." },
		],
		methods: [
			{
				name: "getPoint",
				signature: "getPoint(t: number, target?: Vector3): Vector3",
				description: "Returns the point at parameter t.",
			},
		],
		threeEquivalent: "THREE.CubicBezierCurve3",
		divergence: undefined,
	},
	{
		id: "CatmullRomCurve3",
		name: "CatmullRomCurve3",
		category: "Curves",
		signature:
			"new CatmullRomCurve3(points?: Vector3[], closed?, curveType?, tension?)",
		description:
			"3D Catmull-Rom spline through a set of control points. Supports centripetal, chordal, and catmullrom curve types.",
		properties: [
			{
				name: "points",
				type: "Vector3[]",
				description: "Control points the spline passes through.",
			},
			{
				name: "closed",
				type: "boolean",
				description: "Whether the curve loops. Default false.",
			},
			{
				name: "curveType",
				type: "string",
				description:
					"'centripetal', 'chordal', or 'catmullrom'. Default 'centripetal'.",
			},
			{
				name: "tension",
				type: "number",
				description: "Tension parameter for catmullrom type. Default 0.5.",
			},
		],
		methods: [
			{
				name: "getPoint",
				signature: "getPoint(t: number, target?: Vector3): Vector3",
				description: "Returns the point at parameter t.",
			},
		],
		threeEquivalent: "THREE.CatmullRomCurve3",
		divergence: undefined,
	},
	{
		id: "SplineCurve",
		name: "SplineCurve",
		category: "Curves",
		signature: "new SplineCurve(points?: Vector2[])",
		description: "2D Catmull-Rom spline through a set of points.",
		properties: [
			{
				name: "points",
				type: "Vector2[]",
				description: "Control points the spline passes through.",
			},
		],
		methods: [
			{
				name: "getPoint",
				signature: "getPoint(t: number, target?: Vector2): Vector2",
				description: "Returns the point at parameter t.",
			},
		],
		threeEquivalent: "THREE.SplineCurve",
		divergence: undefined,
	},

	// ── Geometry (additional) ────────────────────────────────────────────────
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
		threeEquivalent: "THREE.BufferAttribute",
		divergence: "No GPU buffer - data is read directly by the CPU rasterizer.",
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
		threeEquivalent: "THREE.InterleavedBuffer",
		divergence: undefined,
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
		threeEquivalent: "THREE.InterleavedBufferAttribute",
		divergence: undefined,
	},

	// ── Constants ────────────────────────────────────────────────────────────
	{
		id: "Layers",
		name: "Layers",
		category: "Math",
		signature: "new Layers()",
		description:
			"32-bit bitmask for layer-based visibility filtering. Used by Raycaster and camera to control which objects are tested or rendered.",
		properties: [
			{
				name: "mask",
				type: "number",
				description: "The raw bitmask. Default 1 (layer 0 enabled).",
			},
		],
		methods: [
			{
				name: "set",
				signature: "set(layer: number): void",
				description: "Enables only the given layer (clears all others).",
			},
			{
				name: "enable",
				signature: "enable(layer: number): void",
				description: "Enables a layer without affecting others.",
			},
			{
				name: "enableAll",
				signature: "enableAll(): void",
				description: "Enables all 32 layers.",
			},
			{
				name: "disable",
				signature: "disable(layer: number): void",
				description: "Disables a single layer.",
			},
			{
				name: "disableAll",
				signature: "disableAll(): void",
				description: "Disables all layers.",
			},
			{
				name: "toggle",
				signature: "toggle(layer: number): void",
				description: "Toggles a layer on or off.",
			},
			{
				name: "test",
				signature: "test(layers: Layers): boolean",
				description: "Returns true if any layer in common is enabled.",
			},
			{
				name: "isEnabled",
				signature: "isEnabled(layer: number): boolean",
				description: "Returns true if the given layer is enabled.",
			},
		],
		threeEquivalent: "THREE.Layers",
		divergence: undefined,
	},
	{
		id: "Layer",
		name: "Layer",
		category: "Math",
		signature: "Layer",
		description:
			"Draw-order layer constants for the painter's algorithm. Higher values draw later (on top).",
		properties: [
			{
				name: "GROUND",
				type: "number",
				description: "Layer 0 - ground tiles.",
			},
			{
				name: "SCENERY",
				type: "number",
				description: "Layer 1 - static scenery.",
			},
			{
				name: "ENTITY",
				type: "number",
				description: "Layer 2 - characters and NPCs.",
			},
			{
				name: "OVERLAY",
				type: "number",
				description: "Layer 3 - UI overlays.",
			},
		],
		methods: [],
		threeEquivalent: undefined,
		divergence: "RuneTek-specific draw-order constant. No THREE equivalent.",
	},
	{
		id: "Side",
		name: "Side",
		category: "Math",
		signature: "Side",
		description: "Face culling constants for materials.",
		properties: [
			{
				name: "Front",
				type: "number",
				description: "Render front faces only (default).",
			},
			{
				name: "Back",
				type: "number",
				description: "Render back faces only.",
			},
			{
				name: "Double",
				type: "number",
				description: "Render both faces.",
			},
		],
		methods: [],
		threeEquivalent: "THREE.FrontSide / THREE.BackSide / THREE.DoubleSide",
		divergence:
			"Frozen enum object instead of individual constants. Side.Double instead of THREE.DoubleSide.",
	},
	{
		id: "Shading",
		name: "Shading",
		category: "Math",
		signature: "Shading",
		description: "Shading mode constants for materials.",
		properties: [
			{
				name: "Flat",
				type: "number",
				description: "Per-face flat shading.",
			},
			{
				name: "Gouraud",
				type: "number",
				description: "Per-vertex interpolated shading.",
			},
		],
		methods: [],
		threeEquivalent: "THREE.FlatShading / THREE.SmoothShading",
		divergence:
			"Shading.Gouraud instead of THREE.SmoothShading. No per-pixel (Phong) shading.",
	},
	{
		id: "Wrapping",
		name: "Wrapping",
		category: "Math",
		signature: "Wrapping",
		description: "Texture wrapping mode constants.",
		properties: [
			{
				name: "ClampToEdge",
				type: "number",
				description: "Clamp UV coordinates to [0, 1].",
			},
			{
				name: "Repeat",
				type: "number",
				description: "Tile the texture beyond [0, 1].",
			},
		],
		methods: [],
		threeEquivalent: "THREE.ClampToEdgeWrapping / THREE.RepeatWrapping",
		divergence: "Frozen enum object instead of individual constants.",
	},
	{
		id: "LightType",
		name: "LightType",
		category: "Math",
		signature: "LightType",
		description:
			"Light type discriminator constants used internally by the pipeline.",
		properties: [
			{
				name: "Ambient",
				type: "number",
				description: "Ambient light (0).",
			},
			{
				name: "Hemisphere",
				type: "number",
				description: "Hemisphere light (1).",
			},
			{
				name: "Directional",
				type: "number",
				description: "Directional light (2).",
			},
			{
				name: "Point",
				type: "number",
				description: "Point light (3).",
			},
			{
				name: "Spot",
				type: "number",
				description: "Spot light (4).",
			},
		],
		methods: [],
		threeEquivalent: undefined,
		divergence: "RuneTek-specific. No THREE equivalent.",
	},
];

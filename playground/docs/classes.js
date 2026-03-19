/** @typedef {{ id: string, name: string, category: string, signature: string, description: string, properties: Array<{ name: string, type: string, description: string }>, methods: Array<{ name: string, signature: string, description: string }>, threeEquivalent: string|null, divergence: string|null }} DocEntry */

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
		divergence: null,
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
				description: "Reserved for future frustum-culling support.",
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
			"Named Node instead of Object3D. No layers.enable/disable helpers - assign the Layers bitmask directly.",
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
			"No background color or environment map - clear color is set on Renderer via setClearColor(). When fog is set, its color overrides the clear color.",
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
			"Casts a ray through the scene and collects triangle-level intersections with Mesh objects.",
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
		divergence:
			"Only Mesh objects are tested - Line and other types are not intersected. No threshold parameter.",
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
				description: "Vertical field of view in radians. Default Math.PI / 4.",
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
			"fov is in radians, not degrees. Constructor takes a single options object, not positional parameters.",
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
			"Named Geometry instead of BufferGeometry (no GPU buffers exist). setPositions/setNormals/setUVs/setColors are convenience wrappers over setAttribute.",
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
		divergence: null,
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
		divergence: null,
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
		divergence: null,
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
		divergence: null,
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
		divergence: null,
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
		divergence:
			"Named BasicMaterial, not MeshBasicMaterial. Accepts hex number, CSS string, or Color instance for color.",
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
			"Named LambertMaterial. Gouraud shading is per-vertex on the CPU - no fragment-shader interpolation.",
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

	// ── Lights ────────────────────────────────────────────────────────────────
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
		divergence: null,
	},
	{
		id: "DirectionalLight",
		name: "DirectionalLight",
		category: "Lights",
		signature: "new DirectionalLight(color?, intensity?)",
		description:
			"Directional light whose direction is derived from the node's position. Shading is per-face (Flat) or per-vertex (Gouraud) depending on the material. No shadows.",
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
		],
		methods: [],
		threeEquivalent: "THREE.DirectionalLight",
		divergence:
			"Direction is derived from the light's scene-graph position, not a separate target object. No shadow support.",
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
		divergence: null,
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
		],
		methods: [],
		threeEquivalent: "THREE.SpotLight",
		divergence:
			"No shadow support. No separate target object - point the light using position and lookAt.",
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
		divergence: null,
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
		divergence: null,
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
		divergence: null,
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
		divergence:
			"Named Animator instead of AnimationMixer. Constructor takes the root node directly rather than a scene.",
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
		divergence: null,
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
		divergence: null,
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
			"Named Track instead of KeyframeTrack - all tracks are keyframe-based. No separate NumberKeyframeTrack/VectorKeyframeTrack subclasses.",
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
		divergence:
			"Triggers needsUpdate = true in the constructor. After painting to the canvas again, set needsUpdate = true manually to refresh the cached pixel data.",
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
			"No needsUpdate step. Data is used directly without re-sampling. Still subject to the 128×128 rendering limit if used as a material map.",
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
			"Per-vertex linear fog interpolated across triangles, same as THREE.Fog. Constructor takes an options object, not positional parameters.",
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
			"update() returns a boolean indicating whether the camera moved. No autoRotate or screenSpacePanning options.",
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
		divergence: null,
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
		divergence: null,
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
		divergence:
			"color parameter is accepted but currently unused - the wireframe renders with vertex colors from the geometry.",
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
];

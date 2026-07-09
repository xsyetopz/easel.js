import type { DocEntry } from "../types.ts";

export const coreDocs = [
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
					"Alias for matrixAutoUpdate. Kept for existing EASEL code.",
			},
			{
				name: "matrixAutoUpdate",
				type: "boolean",
				description:
					"THREE-style flag. When true, matrix is rebuilt from TRS on each updateMatrixWorld call.",
			},
			{
				name: "matrixWorldAutoUpdate",
				type: "boolean",
				description:
					"THREE-style flag. When false, parent updates skip this node's world matrix.",
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
				type: "Color|number|Texture|undefined",
				description:
					"Background clear color or screen-space texture. Accepts a Color instance, hex number, or Texture. Overridden by fog color when fog is set.",
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
			"No environment maps. Texture backgrounds are nearest-neighbour screen fills, not skyboxes or reflections. When fog is set, its color overrides background.",
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
		signature:
			"new Renderer({ width?, height?, canvas?, pixelRatio?, sortObjects? })",
		description:
			"Canvas2D software renderer. Runs the full pipeline each frame: clear background and CPU depth buffer, traverse, fog cull, order draw calls, light bake, rasterize, and upload the framebuffer.",
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
			{
				name: "sortObjects",
				type: "boolean",
				description:
					"THREE-style draw-call sorting flag. Default true. Set false for opaque depth-buffered static scenes.",
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
				description: "Resizes the canvas framebuffer.",
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
					"Sets the background clear color. Accepts a Color instance, hex number, or three r/g/b integers. For texture backgrounds, assign scene.background directly. Fog color overrides both.",
			},
			{
				name: "dispose",
				signature: "dispose(): void",
				description: "Releases renderer resources.",
			},
		],
		threeEquivalent: "THREE.WebGLRenderer",
		divergence:
			"Canvas2D software renderer, not WebGL. Constructor takes an options object. Depth testing is CPU-side and texture backgrounds belong on Scene.background.",
	},
] satisfies DocEntry[];

import type { DocEntry } from "../types.ts";

export const loaderDocs = [
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
] satisfies DocEntry[];

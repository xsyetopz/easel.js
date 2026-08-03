import type { DocEntry } from "../types.ts";

export const textureDocs = [
	{
		id: "Texture",
		name: "Texture",
		category: "Textures",
		signature: "new Texture(image?)",
		description:
			"Image-backed texture clamped to a 128x128 maximum. Set needsUpdate = true after assigning an image to trigger nearest-neighbor downsampling and pixel caching. Runtime sampling maps each UV to min(size - 1, floor(clamp(uv, 0, 1) * size)).",
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
				description: "Cached pixel data, clamped to ≤128x128 (read-only).",
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
			"Hard 128x128 cap - larger images are nearest-neighbor downsampled on needsUpdate. No GPU upload; pixel data lives in a plain ImageData. For atlas rectangles [x, x + w) × [y, y + h) in a W × H atlas, use texel-center UV endpoints (x + 0.5) / W and (x + w - 0.5) / W (and equivalent V coordinates); preserve face orientation by assigning each endpoint to its original corner and swapping the low/high endpoint for reversed U or V faces.",
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
] satisfies DocEntry[];

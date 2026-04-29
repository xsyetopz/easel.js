import type { DocEntry } from "../types.ts";

export const constantDocs = [
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
] satisfies DocEntry[];

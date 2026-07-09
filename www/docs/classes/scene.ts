import type { DocEntry } from "../types.ts";

export const sceneDocs = [
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
] satisfies DocEntry[];

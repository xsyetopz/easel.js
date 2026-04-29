import type { DocEntry } from "../types.ts";

export const lightDocs = [
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
] satisfies DocEntry[];

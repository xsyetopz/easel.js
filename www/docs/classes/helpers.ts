import type { DocEntry } from "../types.ts";

export const helperDocs = [
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
] satisfies DocEntry[];

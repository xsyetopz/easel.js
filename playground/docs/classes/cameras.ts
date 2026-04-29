import type { DocEntry } from "../types.ts";

export const cameraDocs = [
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
] satisfies DocEntry[];

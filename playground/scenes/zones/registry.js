/**
 * @typedef {{ id: string, name: string, icon: string, description: string }} ZoneMeta
 */

/** @type {ZoneMeta[]} */
export const zones = [
	{
		id: "geometry",
		name: "Geometry Gallery",
		icon: "cube",
		description: "All 17 geometry primitives",
	},
	{
		id: "materials",
		name: "Materials Lab",
		icon: "palette",
		description: "Basic, Lambert, Toon materials",
	},
	{
		id: "lighting",
		name: "Lighting Studio",
		icon: "bulb",
		description: "All 5 light types with controls",
	},
	{
		id: "animation",
		name: "Animation Stage",
		icon: "player-play",
		description: "Keyframe playback and blending",
	},
	{
		id: "textures",
		name: "Texture Workshop",
		icon: "photo",
		description: "Texture types and 128px limit",
	},
	{
		id: "interaction",
		name: "Interaction",
		icon: "hand-click",
		description: "Raycaster picking and highlight",
	},
	{
		id: "artifacts",
		name: "Artifacts Museum",
		icon: "microscope",
		description: "Engine quirks: affine warping, painter's sort, vertex wobble",
	},
];

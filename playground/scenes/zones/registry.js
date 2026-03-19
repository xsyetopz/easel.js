/**
 * @typedef {{ id: string, name: string, icon: string, description: string }} ZoneMeta
 */

/** @type {ZoneMeta[]} */
export const zones = [
	{
		id: "primitives",
		name: "Primitives",
		icon: "cube",
		description: "Box, Sphere, Cylinder, Cone, Capsule",
	},
	{
		id: "polyhedra",
		name: "Polyhedra",
		icon: "diamond",
		description: "Icosahedron, Octahedron, Tetrahedron, Dodecahedron",
	},
	{
		id: "parametric",
		name: "Parametric",
		icon: "rotate",
		description: "Torus, TorusKnot, Lathe, Tube",
	},
	{
		id: "planar",
		name: "Planar",
		icon: "square",
		description: "Plane, Ring, Shape, Extrude",
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

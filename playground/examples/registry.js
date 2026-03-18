import * as affineWarping from "./artifacts/affine-warping.js";
import * as fogCutoff from "./artifacts/fog-cutoff.js";
import * as vertexWobble from "./artifacts/vertex-wobble.js";
import * as hsl16Palette from "./color/hsl16-palette.js";
import * as opacitySteps from "./color/opacity-steps.js";
import * as primitives from "./geometry/primitives.js";
import * as helloCube from "./getting-started/hello-cube.js";
import * as lightTypes from "./lighting/light-types.js";
import * as materialTypes from "./materials/material-types.js";
import * as shadingModes from "./materials/shading-modes.js";
import * as hierarchy from "./scene-graph/hierarchy.js";

export const examples = [
	{
		id: "hello-cube",
		name: "Hello Cube",
		category: "getting-started",
		description: "Minimal scene: one box, one material, one render loop.",
		setup: helloCube.setup,
		source: helloCube.source,
		controls: helloCube.controls,
	},
	{
		id: "primitives",
		name: "Geometry Primitives",
		category: "geometry",
		description: "All built-in geometry types with Lambert shading.",
		setup: primitives.setup,
		source: primitives.source,
	},
	{
		id: "material-types",
		name: "Material Types",
		category: "materials",
		description: "BasicMaterial, LambertMaterial, ToonMaterial side by side.",
		setup: materialTypes.setup,
		source: materialTypes.source,
		controls: materialTypes.controls,
	},
	{
		id: "shading-modes",
		name: "Flat vs Gouraud",
		category: "materials",
		description:
			"Flat shading (one color per face) vs Gouraud (per-vertex interpolation).",
		setup: shadingModes.setup,
		source: shadingModes.source,
	},
	{
		id: "light-types",
		name: "Light Types",
		category: "lighting",
		description: "Directional, Point, Spot, and Hemisphere lights.",
		setup: lightTypes.setup,
		source: lightTypes.source,
		controls: lightTypes.controls,
	},
	{
		id: "hsl16-palette",
		name: "HSL16 Palette",
		category: "color",
		description:
			"All 64 hues across 128 lightness steps. The banding is HSL16 quantization.",
		setup: hsl16Palette.setup,
		source: hsl16Palette.source,
	},
	{
		id: "opacity-steps",
		name: "Opacity Steps",
		category: "color",
		description: "9 discrete opacity levels (0-8). No continuous alpha.",
		setup: opacitySteps.setup,
		source: opacitySteps.source,
	},
	{
		id: "vertex-wobble",
		name: "Vertex Wobble",
		category: "artifacts",
		description:
			"Integer coordinate snapping causes edges to stutter during movement.",
		setup: vertexWobble.setup,
		source: vertexWobble.source,
		controls: vertexWobble.controls,
	},
	{
		id: "affine-warping",
		name: "Affine UV Warping",
		category: "artifacts",
		description:
			"Texture distortion from linear UV interpolation without W divide.",
		setup: affineWarping.setup,
		source: affineWarping.source,
	},
	{
		id: "fog-cutoff",
		name: "Fog Cutoff",
		category: "artifacts",
		description: "Tile-radius fog: hard cutoff to black, no gradient.",
		setup: fogCutoff.setup,
		source: fogCutoff.source,
		controls: fogCutoff.controls,
	},
	{
		id: "hierarchy",
		name: "Scene Hierarchy",
		category: "scene-graph",
		description:
			"Sun → planet → moon. Parent-child transforms via Group pivots.",
		setup: hierarchy.setup,
		source: hierarchy.source,
	},
];

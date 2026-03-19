import * as animationBasics from "./animation/animation-basics.js";
import * as animationKeyframes from "./animation/animation-keyframes.js";
import * as affineWarping from "./artifacts/affine-warping.js";
import * as colorBanding from "./artifacts/color-banding.js";
import * as fogCutoff from "./artifacts/fog-cutoff.js";
import * as hsl16Palette from "./artifacts/hsl16-palette.js";
import * as opacitySteps from "./artifacts/opacity-steps.js";
import * as paintersSort from "./artifacts/painters-sort.js";
import * as cameraComparison from "./camera/camera-comparison.js";
import * as geometries from "./geometry/geometries.js";
import * as geometryParameters from "./geometry/geometry-parameters.js";
import * as wireframe from "./geometry/wireframe.js";
import * as interactiveCubes from "./interactive/interactive-cubes.js";
import * as lightTypes from "./lights/light-types.js";
import * as lightsHemisphere from "./lights/lights-hemisphere.js";
import * as lightsPointlights from "./lights/lights-pointlights.js";
import * as flatVsGouraud from "./materials/flat-vs-gouraud.js";
import * as materials from "./materials/materials.js";
import * as materialsToon from "./materials/materials-toon.js";
import * as sceneHierarchy from "./scene-graph/scene-hierarchy.js";
import * as textureCanvas from "./textures/texture-canvas.js";
import * as textureMapping from "./textures/texture-mapping.js";

export const examples = [
	{
		id: "geometries",
		name: "Geometries",
		category: "geometry",
		description: "14 built-in geometry types in a grid with Lambert shading.",
		setup: geometries.setup,
		source: geometries.source,
	},
	{
		id: "geometry-parameters",
		name: "Geometry Parameters",
		category: "geometry",
		description: "Adjust segment count on Sphere, Torus, Cylinder, and Cone.",
		setup: geometryParameters.setup,
		source: geometryParameters.source,
		controls: geometryParameters.controls,
	},
	{
		id: "wireframe",
		name: "Wireframe",
		category: "geometry",
		description: "Triangle mesh structure across geometry types.",
		setup: wireframe.setup,
		source: wireframe.source,
		controls: wireframe.controls,
	},
	{
		id: "materials",
		name: "Materials",
		category: "materials",
		description: "Basic, Lambert, Toon side by side on spheres.",
		setup: materials.setup,
		source: materials.source,
		controls: materials.controls,
	},
	{
		id: "materials-toon",
		name: "Toon Shading",
		category: "materials",
		description: "Cel-shading with ToonMaterial - discrete light steps.",
		setup: materialsToon.setup,
		source: materialsToon.source,
		controls: materialsToon.controls,
	},
	{
		id: "flat-vs-gouraud",
		name: "Flat vs Gouraud",
		category: "materials",
		description:
			"Flat shading (one color per face) vs Gouraud (per-vertex interpolation).",
		setup: flatVsGouraud.setup,
		source: flatVsGouraud.source,
	},
	{
		id: "light-types",
		name: "Light Types",
		category: "lights",
		description: "Switch between Directional, Point, Spot, and Hemisphere.",
		setup: lightTypes.setup,
		source: lightTypes.source,
		controls: lightTypes.controls,
	},
	{
		id: "lights-hemisphere",
		name: "Hemisphere Light",
		category: "lights",
		description: "Sky/ground color gradient on a multi-object scene.",
		setup: lightsHemisphere.setup,
		source: lightsHemisphere.source,
		controls: lightsHemisphere.controls,
	},
	{
		id: "lights-pointlights",
		name: "Point Lights",
		category: "lights",
		description: "Colored point lights orbiting a central torus knot.",
		setup: lightsPointlights.setup,
		source: lightsPointlights.source,
		controls: lightsPointlights.controls,
	},
	{
		id: "camera-comparison",
		name: "Camera Comparison",
		category: "camera",
		description: "Split-screen ortho vs perspective on the same scene.",
		setup: cameraComparison.setup,
		source: cameraComparison.source,
	},
	{
		id: "interactive-cubes",
		name: "Interactive Cubes",
		category: "interactive",
		description: "Hover cubes to highlight them via Raycaster.",
		setup: interactiveCubes.setup,
		source: interactiveCubes.source,
	},
	{
		id: "animation-keyframes",
		name: "Keyframe Animation",
		category: "animation",
		description: "AnimationClip with position and scale VectorTracks.",
		setup: animationKeyframes.setup,
		source: animationKeyframes.source,
		controls: animationKeyframes.controls,
	},
	{
		id: "animation-basics",
		name: "Animation Basics",
		category: "animation",
		description: "Position, rotation, and scale driven by clock.delta.",
		setup: animationBasics.setup,
		source: animationBasics.source,
		controls: animationBasics.controls,
	},
	{
		id: "texture-canvas",
		name: "Canvas Texture",
		category: "textures",
		description: "Procedural texture drawn on an offscreen canvas.",
		setup: textureCanvas.setup,
		source: textureCanvas.source,
		controls: textureCanvas.controls,
	},
	{
		id: "texture-mapping",
		name: "Texture Mapping",
		category: "textures",
		description:
			"UV mapping on a box with TextureLoader. Affine warping visible on angled faces.",
		setup: textureMapping.setup,
		source: textureMapping.source,
	},
	{
		id: "scene-hierarchy",
		name: "Scene Hierarchy",
		category: "scene-graph",
		description: "Sun-planet-moon orbit via parent-child Group pivots.",
		setup: sceneHierarchy.setup,
		source: sceneHierarchy.source,
	},
	{
		id: "affine-warping",
		name: "Affine UV Warping",
		category: "artifacts",
		description: "Ortho vs perspective UV warping with subdivision slider.",
		setup: affineWarping.setup,
		source: affineWarping.source,
		controls: affineWarping.controls,
	},
	{
		id: "painters-sort",
		name: "Painter's Sort",
		category: "artifacts",
		description: "Intersecting meshes expose centroid-sort failure.",
		setup: paintersSort.setup,
		source: paintersSort.source,
		controls: paintersSort.controls,
	},
	{
		id: "hsl16-palette",
		name: "HSL16 Palette",
		category: "artifacts",
		description: "Full HSL16 color space: 64 hues x 128 lightness steps.",
		setup: hsl16Palette.setup,
		source: hsl16Palette.source,
	},
	{
		id: "fog-cutoff",
		name: "Fog Cutoff",
		category: "artifacts",
		description: "Hard tile-radius fog with no gradient.",
		setup: fogCutoff.setup,
		source: fogCutoff.source,
		controls: fogCutoff.controls,
	},
	{
		id: "color-banding",
		name: "Color Banding",
		category: "artifacts",
		description:
			"HSL16 quantization visible as banding on smooth Gouraud surface.",
		setup: colorBanding.setup,
		source: colorBanding.source,
		controls: colorBanding.controls,
	},
	{
		id: "opacity-steps",
		name: "Opacity Steps",
		category: "artifacts",
		description: "9 discrete opacity levels (0-8), no continuous alpha.",
		setup: opacitySteps.setup,
		source: opacitySteps.source,
	},
];

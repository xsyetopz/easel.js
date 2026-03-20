// Animation
import * as animationBasics from "./animation/animation-basics.js";
import * as animationBlending from "./animation/animation-blending.js";
import * as keyframeAnimation from "./animation/keyframe-animation.js";
// Camera
import * as orthographicCamera from "./camera/orthographic-camera.js";
import * as perspectiveCamera from "./camera/perspective-camera.js";
// Geometry
import * as customGeometry from "./geometry/custom-geometry.js";
import * as geometries from "./geometry/geometries.js";
import * as geometryParameters from "./geometry/geometry-parameters.js";
import * as wireframe from "./geometry/wireframe.js";
// Getting Started
import * as helloAnimation from "./getting-started/hello-animation.js";
import * as helloCube from "./getting-started/hello-cube.js";
import * as orbitControls from "./getting-started/orbit-controls.js";
// Helpers
import * as sceneHelpers from "./helpers/scene-helpers.js";
// Interactive
import * as clickEvents from "./interactive/click-events.js";
import * as raycaster from "./interactive/raycaster.js";
// Lights
import * as hemisphereLight from "./lights/hemisphere-light.js";
import * as lightTypes from "./lights/light-types.js";
import * as pointLights from "./lights/point-lights.js";
// Materials
import * as flatVsGouraud from "./materials/flat-vs-gouraud.js";
import * as materialTypes from "./materials/material-types.js";
import * as pointsMaterial from "./materials/points-material.js";
import * as toonShading from "./materials/toon-shading.js";
// Performance
import * as fogDepth from "./performance/fog-depth.js";
import * as meshStress from "./performance/mesh-stress.js";
import * as textureStress from "./performance/texture-stress.js";
import * as triangleDensity from "./performance/triangle-density.js";
// Scene Graph
import * as groupTransforms from "./scene-graph/group-transforms.js";
import * as sceneHierarchy from "./scene-graph/scene-hierarchy.js";
// Textures
import * as canvasTexture from "./textures/canvas-texture.js";
import * as repeatWrapping from "./textures/repeat-wrapping.js";
import * as textureMapping from "./textures/texture-mapping.js";

export const categoryLabels = {
	"getting-started": "Getting Started",
	geometry: "Geometry",
	materials: "Materials",
	lights: "Lights",
	camera: "Camera",
	"scene-graph": "Scene Graph",
	animation: "Animation",
	textures: "Textures",
	interactive: "Interactive",
	helpers: "Helpers",
	performance: "Performance",
};

export const examples = [
	// Getting Started
	helloCube,
	helloAnimation,
	orbitControls,
	// Geometry
	geometries,
	geometryParameters,
	wireframe,
	customGeometry,
	// Materials
	materialTypes,
	toonShading,
	flatVsGouraud,
	pointsMaterial,
	// Lights
	lightTypes,
	hemisphereLight,
	pointLights,
	// Camera
	orthographicCamera,
	perspectiveCamera,
	// Scene Graph
	sceneHierarchy,
	groupTransforms,
	// Animation
	animationBasics,
	keyframeAnimation,
	animationBlending,
	// Textures
	canvasTexture,
	textureMapping,
	repeatWrapping,
	// Interactive
	raycaster,
	clickEvents,
	// Helpers
	sceneHelpers,
	// Performance
	meshStress,
	triangleDensity,
	textureStress,
	fogDepth,
];

// Getting Started

// Animation
import * as animationBasics from "./animation/animation-basics.js";
import * as animationBlending from "./animation/animation-blending.js";
import * as keyframeAnimation from "./animation/keyframe-animation.js";
// Camera
import * as orthographicCamera from "./camera/orthographic-camera.js";
import * as perspectiveCamera from "./camera/perspective-camera.js";
// Geometry
import * as geometries from "./geometry/geometries.js";
import * as geometryParameters from "./geometry/geometry-parameters.js";
import * as wireframe from "./geometry/wireframe.js";
import * as helloAnimation from "./getting-started/hello-animation.js";
import * as helloCube from "./getting-started/hello-cube.js";
import * as orbitControls from "./getting-started/orbit-controls.js";
// Helpers
import * as sceneHelpers from "./helpers/scene-helpers.js";
import * as clickEvents from "./interactive/click-events.js";
// Interactive
import * as raycaster from "./interactive/raycaster.js";
import * as hemisphereLight from "./lights/hemisphere-light.js";
// Lights
import * as lightTypes from "./lights/light-types.js";
import * as pointLights from "./lights/point-lights.js";
import * as flatVsGouraud from "./materials/flat-vs-gouraud.js";
// Materials
import * as materialTypes from "./materials/material-types.js";
import * as toonShading from "./materials/toon-shading.js";
import * as groupTransforms from "./scene-graph/group-transforms.js";
// Scene Graph
import * as sceneHierarchy from "./scene-graph/scene-hierarchy.js";
// Textures
import * as canvasTexture from "./textures/canvas-texture.js";
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
	// Materials
	materialTypes,
	toonShading,
	flatVsGouraud,
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
	// Interactive
	raycaster,
	clickEvents,
	// Helpers
	sceneHelpers,
];

import type { DocEntry } from "../types.ts";

export const controlDocs = [
  {
    id: "OrbitControls",
    name: "OrbitControls",
    category: "Controls",
    signature: "new OrbitControls(camera: Camera, domElement: HTMLElement)",
    description:
      "Pointer-driven orbit controls. Left-drag rotates, scroll zooms, right-drag pans. Dispatches change, start, and end events.",
    properties: [
      {
        name: "camera",
        type: "Camera",
        description: "The camera being controlled.",
      },
      {
        name: "domElement",
        type: "HTMLElement",
        description: "The element that receives pointer events.",
      },
      {
        name: "target",
        type: "Vector3",
        description: "World-space point the camera orbits around.",
      },
      {
        name: "enabled",
        type: "boolean",
        description: "When false, all interaction is ignored.",
      },
      {
        name: "enableRotate",
        type: "boolean",
        description: "Whether left-drag rotation is active.",
      },
      {
        name: "enableZoom",
        type: "boolean",
        description: "Whether scroll-wheel zoom is active.",
      },
      {
        name: "enablePan",
        type: "boolean",
        description: "Whether right-drag panning is active.",
      },
      {
        name: "rotateSpeed",
        type: "number",
        description: "Rotation sensitivity multiplier. Default 1.",
      },
      {
        name: "zoomSpeed",
        type: "number",
        description: "Zoom sensitivity multiplier. Default 1.",
      },
      {
        name: "panSpeed",
        type: "number",
        description: "Pan sensitivity multiplier. Default 1.",
      },
      {
        name: "minDistance",
        type: "number",
        description: "Minimum orbital radius. Default 0.",
      },
      {
        name: "maxDistance",
        type: "number",
        description: "Maximum orbital radius. Default Infinity.",
      },
      {
        name: "minPolarAngle",
        type: "number",
        description: "Minimum polar angle in radians (0 = top). Default 0.",
      },
      {
        name: "maxPolarAngle",
        type: "number",
        description:
          "Maximum polar angle in radians (Math.PI = bottom). Default Math.PI.",
      },
      {
        name: "enableDamping",
        type: "boolean",
        description: "When true, movements decelerate smoothly.",
      },
      {
        name: "dampingFactor",
        type: "number",
        description:
          "Fraction of velocity lost per frame when damping is enabled. Default 0.05.",
      },
      {
        name: "autoRotate",
        type: "boolean",
        description:
          "When true, the camera orbits automatically. Default false.",
      },
      {
        name: "autoRotateSpeed",
        type: "number",
        description: "Auto-rotation speed in degrees per second. Default 2.",
      },
      {
        name: "screenSpacePanning",
        type: "boolean",
        description:
          "When true, panning moves in screen space. When false, panning moves in the camera's local plane. Default true.",
      },
    ],
    methods: [
      {
        name: "update",
        signature: "update(): boolean",
        description:
          "Applies pending rotation, zoom, and pan then repositions the camera. Must be called each frame. Returns true when the camera moved.",
      },
      {
        name: "reset",
        signature: "reset(): void",
        description:
          "Restores camera position and target to their values at construction time.",
      },
      {
        name: "dispose",
        signature: "dispose(): void",
        description:
          "Removes all DOM event listeners. Call when the controls are no longer needed.",
      },
    ],
  },
] satisfies DocEntry[];

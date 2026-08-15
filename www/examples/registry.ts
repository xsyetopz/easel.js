import type {
  ExampleControl,
  ExampleMeta,
  ExampleModule,
} from "../loaders/examples.ts";

export interface ExampleRegistryEntry {
  meta: ExampleMeta;
  controls: ExampleControl[];
  load: () => Promise<ExampleModule>;
}

export const categoryLabels = {
  motion: "Motion",
  worlds: "World Building",
  interaction: "Interaction Tools",
  materials: "Materials & Lighting",
  geometry: "Geometry & Paths",
  assets: "Assets",
  data: "Data & Export",
} as const;

export const examples: ExampleRegistryEntry[] = [
  {
    meta: {
      id: "character-motion-review",
      name: "Character Motion Review",
      category: "motion",
      animated: true,
      description: "A skeletal motion clip drives an animated bone hierarchy.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/character-motion-review.js")).example,
  },
  {
    meta: {
      id: "clip-switcher",
      name: "Clip Switcher",
      category: "motion",
      animated: true,
      description:
        "Switch between named clips on a grouped mechanical assembly.",
    },
    controls: [],
    load: async () => (await import("./misc/clip-switcher.js")).example,
  },
  {
    meta: {
      id: "coordinated-motion",
      name: "Coordinated Motion",
      category: "motion",
      animated: true,
      description:
        "Keep several moving parts in sync with one animation group.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/animation/coordinated-motion.js")).example,
  },
  {
    meta: {
      id: "keyframe-timeline",
      name: "Keyframe Timeline",
      category: "motion",
      animated: true,
      description:
        "Scrub a keyed prop through position, rotation, and scale tracks.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/animation/keyframe-timeline.js")).example,
  },
  {
    meta: {
      id: "crowd-budget",
      name: "Crowd Budget",
      category: "worlds",
      animated: true,
      description:
        "Measure a repeated field of agents while their transforms update.",
    },
    controls: [
      {
        type: "slider",
        key: "count",
        label: "Instances",
        min: 4,
        max: 64,
        step: 4,
        default: 36,
      },
    ],
    load: async () =>
      (await import("./canvas/interaction/crowd-budget.js")).example,
  },
  {
    meta: {
      id: "collision-bounds",
      name: "Collision Bounds",
      category: "worlds",
      animated: true,
      description: "Visualize oriented bounds around a moving object.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/scene/collision-bounds.js")).example,
  },
  {
    meta: {
      id: "heightfield-explorer",
      name: "Heightfield Explorer",
      category: "worlds",
      animated: true,
      description:
        "Click to lock the pointer, then use WASD and the mouse to explore the terrain.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/geometry/heightfield-explorer.js")).example,
  },
  {
    meta: {
      id: "lod-budget",
      name: "Level-of-Detail Budget",
      category: "worlds",
      animated: true,
      description:
        "Compare near and distant mesh detail while moving the camera.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/interaction/lod-budget.js")).example,
  },
  {
    meta: {
      id: "terrain-placement",
      name: "Terrain Placement",
      category: "worlds",
      animated: true,
      description: "Place a marker on terrain by clicking a world position.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/geometry/terrain-placement.js")).example,
  },
  {
    meta: {
      id: "top-down-map",
      name: "Top-Down Map",
      category: "worlds",
      animated: true,
      description:
        "Pan an orthographic map view across a layered level blockout.",
    },
    controls: [],
    load: async () => (await import("./misc/top-down-map.js")).example,
  },
  {
    meta: {
      id: "voxel-level",
      name: "Voxel Level",
      category: "worlds",
      animated: true,
      description:
        "Batch a small island, path, pond, and watchtower by voxel material.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/geometry/voxel-level.js")).example,
  },
  {
    meta: {
      id: "first-person-walkthrough",
      name: "First-Person Walkthrough",
      category: "interaction",
      animated: true,
      description:
        "Click to lock the pointer, then use WASD and the mouse to explore a compact corridor.",
    },
    controls: [],
    load: async () =>
      (await import("./misc/first-person-walkthrough.js")).example,
  },
  {
    meta: {
      id: "instance-selection",
      name: "Instance Selection",
      category: "interaction",
      animated: true,
      description: "Select one repeated prop inside a dense scene.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/interaction/instance-selection.js")).example,
  },
  {
    meta: {
      id: "object-placement",
      name: "Object Placement",
      category: "interaction",
      animated: true,
      description: "Drag scene objects into place with pointer controls.",
    },
    controls: [],
    load: async () => (await import("./misc/object-placement.js")).example,
  },
  {
    meta: {
      id: "orthographic-blueprint",
      name: "Orthographic Blueprint",
      category: "interaction",
      animated: true,
      description:
        "Pan and zoom a layered floor plan with openings, fixtures, and dimensions.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/direct/orthographic-blueprint.js")).example,
  },
  {
    meta: {
      id: "orthographic-selection",
      name: "Orthographic Selection",
      category: "interaction",
      animated: true,
      description:
        "Select map objects from a plan view without perspective distortion.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/interaction/orthographic-selection.js")).example,
  },
  {
    meta: {
      id: "point-selection",
      name: "Point Selection",
      category: "interaction",
      animated: true,
      description: "Pick a point in a dense measurement cloud.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/interaction/point-selection.js")).example,
  },
  {
    meta: {
      id: "product-turntable",
      name: "Product Turntable",
      category: "interaction",
      animated: true,
      description: "A damped turntable camera rotates around a prop.",
    },
    controls: [],
    load: async () => (await import("./misc/product-turntable.js")).example,
  },
  {
    meta: {
      id: "scene-picking",
      name: "Scene Picking",
      category: "interaction",
      animated: true,
      description: "Pick a scene object and highlight the current selection.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/interaction/scene-picking.js")).example,
  },
  {
    meta: {
      id: "scene-transform",
      name: "Scene Transform",
      category: "interaction",
      animated: true,
      description: "Translate, rotate, and scale a selected scene object.",
    },
    controls: [
      {
        type: "select",
        key: "mode",
        label: "Transform mode",
        options: ["translate", "rotate", "scale"],
        default: "translate",
      },
    ],
    load: async () => (await import("./misc/scene-transform.js")).example,
  },
  {
    meta: {
      id: "texture-picking",
      name: "Texture Picking",
      category: "interaction",
      animated: true,
      description: "A marker follows pointer hits across a patterned board.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/scene/texture-picking.js")).example,
  },
  {
    meta: {
      id: "billboard-particles",
      name: "Billboard Particles",
      category: "materials",
      animated: true,
      description:
        "Render camera-facing particles for smoke, debris, or markers.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/scene/billboard-particles.js")).example,
  },
  {
    meta: {
      id: "lighting-bench",
      name: "Lighting Bench",
      category: "materials",
      animated: true,
      description:
        "Compare two light rigs against the same fixed forms and materials.",
    },
    controls: [
      {
        type: "select",
        key: "rig",
        label: "Lighting rig",
        options: ["daylight", "studio"],
        default: "daylight",
      },
    ],
    load: async () =>
      (await import("./canvas/scene/lighting-bench.js")).example,
  },
  {
    meta: {
      id: "linework-overlay",
      name: "Linework Overlay",
      category: "materials",
      animated: true,
      description:
        "Lay colored linework over a scene for routes and annotations.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/direct/linework-overlay.js")).example,
  },
  {
    meta: {
      id: "normal-inspection",
      name: "Normal Inspection",
      category: "materials",
      animated: true,
      description: "Wireframe and edge overlays show mesh topology.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/scene/normal-inspection.js")).example,
  },
  {
    meta: {
      id: "particle-emitter",
      name: "Particle Emitter",
      category: "materials",
      animated: true,
      description: "Update a live point emitter with deterministic motion.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/scene/particle-emitter.js")).example,
  },
  {
    meta: {
      id: "texture-atlas-review",
      name: "Texture Atlas Review",
      category: "materials",
      animated: true,
      description: "Nearest-neighbor atlas regions cover a textured surface.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/scene/texture-atlas-review.js")).example,
  },
  {
    meta: {
      id: "texture-surface-review",
      name: "Texture Surface Review",
      category: "materials",
      animated: true,
      description: "A textured prop rotates under a stable camera.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/scene/texture-surface-review.js")).example,
  },
  {
    meta: {
      id: "vertex-color-review",
      name: "Vertex Color Review",
      category: "materials",
      animated: true,
      description: "Authored vertex colors remain visible on a lit mesh.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/scene/vertex-color-review.js")).example,
  },
  {
    meta: {
      id: "wave-surface",
      name: "Wave Surface",
      category: "materials",
      animated: true,
      description: "Sampled points form a moving water surface.",
    },
    controls: [],
    load: async () => (await import("./canvas/scene/wave-surface.js")).example,
  },
  {
    meta: {
      id: "convex-collision-hull",
      name: "Convex Collision Hull",
      category: "geometry",
      animated: true,
      description: "Wrap authored points in a convex hull for collision setup.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/geometry/convex-collision-hull.js")).example,
  },
  {
    meta: {
      id: "curve-editor",
      name: "Curve Editor",
      category: "geometry",
      animated: true,
      description: "Move path control points and preview the resulting curve.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/geometry/curve-editor.js")).example,
  },
  {
    meta: {
      id: "nurbs-surface-review",
      name: "NURBS Surface Review",
      category: "geometry",
      animated: true,
      description: "A smooth control-point surface represents a modeling form.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/geometry/nurbs-surface-review.js")).example,
  },
  {
    meta: {
      id: "swept-cable",
      name: "Swept Cable",
      category: "geometry",
      animated: true,
      description: "Turn a path into a swept cable, rail, or road section.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/geometry/swept-cable.js")).example,
  },
  {
    meta: {
      id: "font-specimen",
      name: "Font Specimen",
      category: "assets",
      animated: true,
      description: "Turn TTF glyph outlines into a readable 3D specimen.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/font-specimen.js")).example,
  },
  {
    meta: {
      id: "data-texture-review",
      name: "Data Texture Review",
      category: "assets",
      animated: true,
      description: "Check packed RGBA data on a neutral textured surface.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/data-texture-review.js")).example,
  },
  {
    meta: {
      id: "instanced-asset-review",
      name: "Instanced Asset Review",
      category: "assets",
      animated: true,
      description:
        "Review 125 transforms from the Khronos Simple Instancing asset.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/instanced-asset-review.js")).example,
  },
  {
    meta: {
      id: "obj-model-review",
      name: "OBJ Asset Import",
      category: "assets",
      animated: true,
      description:
        "Load the canonical Suzanne test model from a Wavefront OBJ file.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/obj-model-review.js")).example,
  },
  {
    meta: {
      id: "point-cloud-review",
      name: "Point Cloud Review",
      category: "assets",
      animated: true,
      description:
        "Inspect 213 authored positions and RGB samples from an ASCII PCD file.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/point-cloud-review.js")).example,
  },
  {
    meta: {
      id: "print-model-review",
      name: "Print Model Review",
      category: "assets",
      animated: true,
      description:
        "Check the surface and slot of a triangulated STL disk before slicing.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/print-model-review.js")).example,
  },
  {
    meta: {
      id: "product-model-viewer",
      name: "Product Model Viewer",
      category: "assets",
      animated: true,
      description:
        "Frame the canonical Khronos Box glTF asset with fixed camera lighting.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/product-model-viewer.js")).example,
  },
  {
    meta: {
      id: "scan-mesh-review",
      name: "Scan Mesh Review",
      category: "assets",
      animated: true,
      description:
        "Triangulate a polygon PLY dolphin scan and reconstruct smooth normals.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/scan-mesh-review.js")).example,
  },
  {
    meta: {
      id: "voxel-asset-review",
      name: "Voxel Asset Review",
      category: "assets",
      animated: true,
      description:
        "Inspect a MagicaVoxel knight while preserving its authored palette.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/voxel-asset-review.js")).example,
  },
  {
    meta: {
      id: "xyz-point-cloud-review",
      name: "XYZ Point Cloud Review",
      category: "assets",
      animated: true,
      description:
        "Review a 201-sample helix stored as plain XYZ measurements.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/xyz-point-cloud-review.js")).example,
  },
  {
    meta: {
      id: "cnc-toolpath-preview",
      name: "CNC Toolpath Preview",
      category: "data",
      animated: true,
      description:
        "Separate G0 travel moves from G1 cuts in a real calibration program.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/cnc-toolpath-preview.js")).example,
  },
  {
    meta: {
      id: "gcode-export-check",
      name: "G-code Export Check",
      category: "data",
      animated: true,
      description: "A rotating mesh supplies geometry to a G-code export call.",
    },
    controls: [],
    load: async () => (await import("./misc/gcode-export-check.js")).example,
  },
  {
    meta: {
      id: "gltf-export-check",
      name: "glTF Export Check",
      category: "data",
      animated: true,
      description: "A rotating mesh supplies a scene to a glTF export call.",
    },
    controls: [],
    load: async () => (await import("./misc/gltf-export-check.js")).example,
  },
  {
    meta: {
      id: "gltf-normal-check",
      name: "glTF Normal Check",
      category: "data",
      animated: true,
      description:
        "Two lit planes supply normalized normals to a glTF export call.",
    },
    controls: [],
    load: async () => (await import("./misc/gltf-normal-check.js")).example,
  },
  {
    meta: {
      id: "molecular-structure-review",
      name: "Molecular Structure Review",
      category: "data",
      animated: true,
      description:
        "Inspect the atoms, CPK colors, and bonds in a caffeine PDB structure.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/molecular-structure-review.js")).example,
  },
  {
    meta: {
      id: "obj-export-check",
      name: "OBJ Export Check",
      category: "data",
      animated: true,
      description: "A rotating mesh supplies geometry to an OBJ export call.",
    },
    controls: [],
    load: async () => (await import("./misc/obj-export-check.js")).example,
  },
  {
    meta: {
      id: "ply-export-check",
      name: "PLY Export Check",
      category: "data",
      animated: true,
      description: "A rotating mesh supplies geometry to a PLY export call.",
    },
    controls: [],
    load: async () => (await import("./misc/ply-export-check.js")).example,
  },
  {
    meta: {
      id: "stl-export-check",
      name: "STL Export Check",
      category: "data",
      animated: true,
      description: "A rotating mesh supplies geometry to an STL export call.",
    },
    controls: [],
    load: async () => (await import("./misc/stl-export-check.js")).example,
  },
  {
    meta: {
      id: "volume-slice-review",
      name: "Volume Slice Review",
      category: "data",
      animated: true,
      description:
        "Step through an NRRD slice while keeping its orientation visible.",
    },
    controls: [],
    load: async () =>
      (await import("./canvas/loader/volume-slice-review.js")).example,
  },
];

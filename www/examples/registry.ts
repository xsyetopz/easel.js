import type {
  ExampleControl,
  ExampleMeta,
  ExampleModule,
} from "../loaders/examples.ts";

export interface ExampleRegistryEntry {
  meta: ExampleMeta;
  controls: ExampleControl[];
  easelSource: string;
  load: () => Promise<ExampleModule>;
}

export const categoryLabels = {
  motion: "Motion",
  worlds: "World Building",
  interaction: "Interaction Tools",
  materials: "Materials & Lighting",
  geometry: "Geometry & Paths",
  assets: "Asset Review",
  data: "Data & Export",
} as const;

export const examples: ExampleRegistryEntry[] = [
  {
    meta: {
      id: "character-motion-review",
      name: "Character Motion Review",
      category: "motion",
      animated: true,
      description:
        "Inspect a skeletal motion clip with its animated hierarchy.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const result = new EASEL.BVHLoader().parse(text);
scene.add(result.root, new EASEL.SkeletonHelper(result.root));
const animator = new EASEL.Animator(result.root);
animator.clipAction(result.clip).play();
animator.update(delta);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const group = new EASEL.AnimationGroup(meshA, meshB, meshC);
const clip = new EASEL.AnimationClip("spin", 2, [
  new EASEL.NumberTrack("rotation.y", [0, 1, 2], [0, Math.PI, Math.PI * 2]),
]);
const animator = new EASEL.Animator(group);
animator.clipAction(clip).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.update(delta);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const group = new EASEL.AnimationGroup(meshA, meshB, meshC, meshD);
const spin = new EASEL.AnimationClip("spin", 2.8, [
  new EASEL.NumberTrack("rotation.y", [0, 1.4, 2.8], [0, Math.PI, Math.PI * 2]),
]);
const bounce = new EASEL.AnimationClip("bounce", 1.4, [
  new EASEL.NumberTrack("position.y", [0, 0.7, 1.4], [0.7, 1.55, 0.7]),
]);
const animator = new EASEL.Animator(group);
animator.clipAction(spin).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.clipAction(bounce).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.update(delta);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const clip = new EASEL.AnimationClip("keyframes", 2.4, [
  new EASEL.NumberTrack("position.y", [0, 0.6, 1.2, 1.8, 2.4], [0.8, 1.8, 0.8, 1.8, 0.8]),
  new EASEL.NumberTrack("rotation.y", [0, 2.4], [0, Math.PI * 2]),
]);
const animator = new EASEL.Animator(mesh);
animator.clipAction(clip).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.update(delta);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const mesh = new EASEL.InstancedMesh(geometry, material, 64);
mesh.setMatrixAt(index, matrix);
mesh.setColorAt(index, new EASEL.Color(0x5da8e8));
mesh.count = activeCount;`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const bounds = new EASEL.Box3().setFromCenterAndSize(
  new EASEL.Vector3(),
  new EASEL.Vector3(1.8, 1.8, 1.8),
);
const a = new EASEL.OBB().fromBox3(bounds).applyMatrix4(boxA.matrixWorld);
const b = new EASEL.OBB().fromBox3(bounds).applyMatrix4(boxB.matrixWorld);
const overlaps = a.intersectsOBB(b);`,
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
        "Navigate a generated terrain surface with a stable outdoor composition.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const terrain = new EASEL.Geometry();
terrain.setPositions(heightField);
terrain.index = gridIndices;
terrain.computeVertexNormals();`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const lod = new EASEL.LOD();
lod.addLevel(highMesh, 0, 0.08);
lod.addLevel(lowMesh, 8, 0.08);
lod.update(camera);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObject(terrain)[0];
if (hit) marker.position.copy(hit.point);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const camera = new EASEL.OrthographicCamera({ left: -5.5, right: 5.5, top: 3.1, bottom: -3.1 });
const controls = new EASEL.MapControls(camera, renderer.domElement);
controls.screenSpacePanning = false;
controls.update();`,
    load: async () => (await import("./misc/top-down-map.js")).example,
  },
  {
    meta: {
      id: "voxel-level",
      name: "Voxel Level",
      category: "worlds",
      animated: true,
      description: "Build a small blockout from reusable voxel materials.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
world.add(new EASEL.Mesh(sharedCube, grassMaterial));`,
    load: async () =>
      (await import("./canvas/geometry/voxel-level.js")).example,
  },
  {
    meta: {
      id: "first-person-walkthrough",
      name: "First-Person Walkthrough",
      category: "interaction",
      animated: true,
      description: "Walk through a small scene with keyboard-look controls.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const controls = new EASEL.FlyControls(camera, renderer.domElement);
controls.movementSpeed = 3;
controls.rollSpeed = 0.7;
controls.update(delta);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObject(instancedMesh, false)[0];
const selectedId = hit?.instanceId ?? -1;`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const controls = new EASEL.DragControls(objects, camera, renderer.domElement);
controls.addEventListener("drag", ({ object }) => object.updateMatrix());`,
    load: async () => (await import("./misc/object-placement.js")).example,
  },
  {
    meta: {
      id: "orthographic-blueprint",
      name: "Orthographic Blueprint",
      category: "interaction",
      animated: true,
      description: "Pan a measured plan view for layout and annotation work.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const camera = new EASEL.OrthographicCamera({ left: -6, right: 6, top: 3.375, bottom: -3.375 });
camera.position.set(0, 8, 0.01);
camera.lookAt(new EASEL.Vector3(0, 0, 0));
const grid = new EASEL.GridHelper(10, 10, 0x2e607c, 0x163448);
const controls = new EASEL.MapControls(camera, canvas);
controls.enableRotate = false;
scene.add(grid, footprint, partitions, measurements);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const camera = new EASEL.OrthographicCamera({ left: -6, right: 6, top: 3.5, bottom: -3.5 });
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObjects(cubes, false)[0];`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
raycaster.pointsThreshold = 0.14;
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObject(points, false)[0];
colors.setXYZ(hit.index, 1, 0.86, 0.28);`,
    load: async () =>
      (await import("./canvas/interaction/point-selection.js")).example,
  },
  {
    meta: {
      id: "product-turntable",
      name: "Product Turntable",
      category: "interaction",
      animated: true,
      description:
        "Inspect a prop from every angle with a damped turntable camera.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const controls = new EASEL.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObjects(cubes, false)[0];
selected.material.color.set(0xffe16b);`,
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
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const controls = new EASEL.TransformControls(camera, canvas);
controls.attach(mesh);
controls.setMode("translate");
controls.axis = "XYZ";`,
    load: async () => (await import("./misc/scene-transform.js")).example,
  },
  {
    meta: {
      id: "texture-picking",
      name: "Texture Picking",
      category: "interaction",
      animated: true,
      description:
        "Pick a texture coordinate on a board and report its location.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const hit = raycaster.intersectObject(board)[0];
const uv = { x: (hit.point.x + 2.2) / 4.4, y: (hit.point.y + 1.6) / 3.2 };
marker.position.copy(hit.point);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const points = new EASEL.Points(geometry, new EASEL.PointsMaterial({ color: 0x73d5ec, size: 4 }));
scene.add(points);`,
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
        "Compare a controlled daylight rig against a neutral studio setup.",
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const studio = params.rig === "studio";
scene.background = new EASEL.Color(studio ? 0x1b2230 : 0x8fc7eb);
scene.add(new EASEL.HemisphereLight(0x9edcff, 0x493c37, studio ? 0 : 1.05));
scene.add(new EASEL.AmbientLight(0xffffff, studio ? 0.72 : 0.12));
const key = new EASEL.DirectionalLight(studio ? 0xffffff : 0xfff5d6, studio ? 0.28 : 0.55);
const fill = new EASEL.DirectionalLight(0x9ec9ff, studio ? 0.45 : 0);
scene.add(key, fill);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
geometry.setColors(colors);
const lines = new EASEL.LineSegments(geometry, new EASEL.LineMaterial({ color: 0xffffff }));`,
    load: async () =>
      (await import("./canvas/direct/linework-overlay.js")).example,
  },
  {
    meta: {
      id: "normal-inspection",
      name: "Normal Inspection",
      category: "materials",
      animated: true,
      description: "Inspect mesh topology with wireframe and edge overlays.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
geometry.computeVertexNormals();
const wireframe = new EASEL.LineSegments(
  new EASEL.WireframeGeometry(geometry),
  new EASEL.LineMaterial({ color: 0xe9f0ff }),
);
scene.add(wireframe, new EASEL.BoxHelper(mesh));`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
position.setXYZ(index, x, y, z);
position.needsUpdate = true;
geometry.computeBoundingSphere();`,
    load: async () =>
      (await import("./canvas/scene/particle-emitter.js")).example,
  },
  {
    meta: {
      id: "texture-atlas-review",
      name: "Texture Atlas Review",
      category: "materials",
      animated: true,
      description:
        "Inspect nearest-neighbor atlas regions on a textured surface.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
uv.setXY(vertex, random(), random());
uv.needsUpdate = true;
const material = new EASEL.BasicMaterial({ map: new EASEL.DataTexture(gridPixels, 32, 32) });`,
    load: async () =>
      (await import("./canvas/scene/texture-atlas-review.js")).example,
  },
  {
    meta: {
      id: "texture-surface-review",
      name: "Texture Surface Review",
      category: "materials",
      animated: true,
      description:
        "Check a textured prop under a stable camera before shipping an asset.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const texture = new EASEL.DataTexture(checkerPixels, 32, 32);
const cube = new EASEL.Mesh(new EASEL.BoxGeometry(2.5, 2.5, 2.5),
  new EASEL.BasicMaterial({ map: texture }));`,
    load: async () =>
      (await import("./canvas/scene/texture-surface-review.js")).example,
  },
  {
    meta: {
      id: "vertex-color-review",
      name: "Vertex Color Review",
      category: "materials",
      animated: true,
      description: "Inspect authored vertex colors on a lit mesh.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
geometry.setColors(faceColors);
geometry.index = faceIndices;
const mesh = new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ color: 0xffffff, vertexColors: true }));`,
    load: async () =>
      (await import("./canvas/scene/vertex-color-review.js")).example,
  },
  {
    meta: {
      id: "wave-surface",
      name: "Wave Surface",
      category: "materials",
      animated: true,
      description: "Inspect a moving water surface built from sampled points.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
for (const vertex of vertices) position.setXYZ(vertex, x, wave, z);
position.needsUpdate = true;`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const geometry = new EASEL.ConvexGeometry(points);
const mesh = new EASEL.Mesh(geometry, material);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
points[selected].set(pointer.x, pointer.y, 0);
path.points = points;
tube.geometry = new EASEL.TubeGeometry(path, 36, 0.2, 8);`,
    load: async () =>
      (await import("./canvas/geometry/curve-editor.js")).example,
  },
  {
    meta: {
      id: "nurbs-surface-review",
      name: "NURBS Surface Review",
      category: "geometry",
      animated: true,
      description: "Inspect a smooth control-point surface used in modeling.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const curve = new EASEL.NURBSCurve(degree, knots, controlPoints);
const geometry = new EASEL.TubeGeometry(curve, 42, 0.22, 12);
const surface = new EASEL.NURBSSurface(degree1, degree2, knots1, knots2, surfaceControlPoints);
const surfaceGeometry = new EASEL.ParametricGeometry((u, v, target) => surface.getPoint(u, v, target), 18, 18);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const plate = new EASEL.ExtrudeGeometry(shape, { depth: 0.5, steps: 3 });
const ribbon = new EASEL.TubeGeometry(new EASEL.CatmullRomCurve3(points), 28, 0.16, 8);`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const data = new EASEL.TTFLoader().parse(arrayBuffer);
const font = new EASEL.TTFFont(data);
const geometry = new EASEL.ShapeGeometry(font.generateShapes("EASEL", 100));
const mesh = new EASEL.Mesh(geometry, material);`,
    load: async () =>
      (await import("./canvas/loader/font-specimen.js")).example,
  },
  {
    meta: {
      id: "hdr-texture-review",
      name: "Data Texture Review",
      category: "assets",
      animated: true,
      description: "Check packed RGBA data on a neutral textured surface.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const texture = new EASEL.DataTexture(rgbaBytes, 4, 2);
texture.buildBrightnessLevels();
const material = new EASEL.BasicMaterial({ map: texture });`,
    load: async () =>
      (await import("./canvas/loader/hdr-texture-review.js")).example,
  },
  {
    meta: {
      id: "instanced-asset-review",
      name: "Instanced Asset Review",
      category: "assets",
      animated: true,
      description:
        "Review repeated glTF parts without duplicating source geometry.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const result = new EASEL.GLTFLoader().parse(document);
scene.add(result.scene);`,
    load: async () =>
      (await import("./canvas/loader/instanced-asset-review.js")).example,
  },
  {
    meta: {
      id: "obj-model-review",
      name: "OBJ Model Review",
      category: "assets",
      animated: true,
      description: "Open an OBJ model for a quick browser-side mesh check.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
import { OBJLoader } from "@xsyetopz/easel";
const group = new EASEL.OBJLoader().parse(text);
scene.add(group);`,
    load: async () =>
      (await import("./canvas/loader/obj-model-review.js")).example,
  },
  {
    meta: {
      id: "point-cloud-review",
      name: "Point Cloud Review",
      category: "assets",
      animated: true,
      description: "Inspect a PCD scan as selectable rendered points.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const geometry = new EASEL.PCDLoader().parse(text);
const points = new EASEL.Points(geometry, material);`,
    load: async () =>
      (await import("./canvas/loader/point-cloud-review.js")).example,
  },
  {
    meta: {
      id: "print-model-review",
      name: "Print Model Review",
      category: "assets",
      animated: true,
      description: "Check an STL shell before it reaches a slicer.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
import { STLLoader } from "@xsyetopz/easel";
const geometry = new STLLoader().parse(text);
const mesh = new EASEL.Mesh(geometry, material);`,
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
        "Review a glTF asset with a fixed camera and clean lighting.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const result = new EASEL.GLTFLoader().parse(document);
scene.add(result.scene);`,
    load: async () =>
      (await import("./canvas/loader/product-model-viewer.js")).example,
  },
  {
    meta: {
      id: "scan-mesh-review",
      name: "Scan Mesh Review",
      category: "assets",
      animated: true,
      description: "Inspect a PLY scan with its authored vertex data.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
import { PLYLoader } from "@xsyetopz/easel";
const geometry = new PLYLoader().parse(data);
const mesh = new EASEL.Mesh(geometry, material);`,
    load: async () =>
      (await import("./canvas/loader/scan-mesh-review.js")).example,
  },
  {
    meta: {
      id: "voxel-asset-review",
      name: "Voxel Asset Review",
      category: "assets",
      animated: true,
      description: "Open a VOX blockout and inspect its palette and structure.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const result = new EASEL.VOXLoader().parse(arrayBuffer);
const mesh = EASEL.buildVOXMesh(result.chunks[0]);
scene.add(mesh);`,
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
        "Review XYZ point samples as a lightweight measurement cloud.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
import { XYZLoader } from "@xsyetopz/easel";
const geometry = new XYZLoader().parse(text);
const points = new EASEL.Points(geometry, material);`,
    load: async () =>
      (await import("./canvas/loader/xyz-point-cloud-review.js")).example,
  },
  {
    meta: {
      id: "cnc-toolpath-preview",
      name: "CNC Toolpath Preview",
      category: "data",
      animated: true,
      description: "Review G-code layers and travel moves before machining.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const loader = new EASEL.GCodeLoader();
loader.splitLayer = true;
const model = loader.parse(data);
scene.add(model);`,
    load: async () =>
      (await import("./canvas/loader/cnc-toolpath-preview.js")).example,
  },
  {
    meta: {
      id: "gcode-export-check",
      name: "G-code Export Check",
      category: "data",
      animated: true,
      description:
        "Generate a compact toolpath from scene geometry for review.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const exporter = new EASEL.GCodeExporter();
const text = exporter.parse(scene, { layerHeight: 0.2 });`,
    load: async () => (await import("./misc/gcode-export-check.js")).example,
  },
  {
    meta: {
      id: "gltf-export-check",
      name: "glTF Export Check",
      category: "data",
      animated: true,
      description: "Export a scene to glTF and inspect the resulting document.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const exporter = new EASEL.GLTFExporter();
const result = exporter.parse(scene);`,
    load: async () => (await import("./misc/gltf-export-check.js")).example,
  },
  {
    meta: {
      id: "gltf-normal-check",
      name: "glTF Normal Check",
      category: "data",
      animated: true,
      description:
        "Export vertex normals with a glTF scene for downstream shading.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const exporter = new EASEL.GLTFExporter();
const result = exporter.parse(scene, { normalizeNormals: true });`,
    load: async () => (await import("./misc/gltf-normal-check.js")).example,
  },
  {
    meta: {
      id: "molecular-structure-review",
      name: "Molecular Structure Review",
      category: "data",
      animated: true,
      description: "Inspect a PDB structure as a navigable molecular scene.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
import { PDBLoader } from "@xsyetopz/easel";
const pdb = new PDBLoader().parse(text);
const atoms = new EASEL.Points(pdb.geometryAtoms, atomMaterial);
const bonds = new EASEL.LineSegments(pdb.geometryBonds, bondMaterial);`,
    load: async () =>
      (await import("./canvas/loader/molecular-structure-review.js")).example,
  },
  {
    meta: {
      id: "obj-export-check",
      name: "OBJ Export Check",
      category: "data",
      animated: true,
      description:
        "Round-trip a selected mesh as OBJ text for a downstream tool.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const exporter = new EASEL.OBJExporter();
const text = exporter.parse(scene);`,
    load: async () => (await import("./misc/obj-export-check.js")).example,
  },
  {
    meta: {
      id: "ply-export-check",
      name: "PLY Export Check",
      category: "data",
      animated: true,
      description:
        "Write a selected mesh as PLY for scan and point-cloud tooling.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const exporter = new EASEL.PLYExporter();
const text = exporter.parse(scene);`,
    load: async () => (await import("./misc/ply-export-check.js")).example,
  },
  {
    meta: {
      id: "stl-export-check",
      name: "STL Export Check",
      category: "data",
      animated: true,
      description: "Write a watertight mesh as STL for fabrication workflows.",
    },
    controls: [],
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const exporter = new EASEL.STLExporter();
const text = exporter.parse(scene, "EASELBox");`,
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
    easelSource: `import * as EASEL from "@xsyetopz/easel";
const volume = new EASEL.NRRDLoader().parse(nrrdText);
const texture = volume.toDataTexture("z", 0);
scene.add(new EASEL.Mesh(new EASEL.PlaneGeometry(2, 2), new EASEL.BasicMaterial({ map: texture })));`,
    load: async () =>
      (await import("./canvas/loader/volume-slice-review.js")).example,
  },
];

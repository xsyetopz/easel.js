import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CameraHelper,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * Every registry example currently has a THREE source. Keep this list explicit
 * so a new example cannot silently fall back to a generic scene: adding a
 * source requires adding a named adapter here (and its boundary below).
 */
export const THREE_COMPARISON_ADAPTER_IDS = Object.freeze([
  "misc_animation_groups",
  "misc_animation_keys",
  "misc_controls_orbit",
  "misc_controls_arcball",
  "misc_controls_drag",
  "misc_controls_fly",
  "misc_controls_map",
  "misc_controls_pointerlock",
  "misc_controls_trackball",
  "misc_controls_transform",
  "misc_raycaster_helper",
  "misc_boxselection",
  "misc_uv_tests",
  "misc_exporter_obj",
  "misc_exporter_gltf",
  "misc_exporter_gltf_normals",
  "misc_exporter_exr",
  "misc_exporter_gcode",
  "misc_exporter_ply",
  "misc_exporter_stl",
  "webaudio_orientation",
  "webaudio_sandbox",
  "webaudio_timing",
  "webaudio_visualizer",
  "css2d_label",
  "css3d_mixed",
  "css3d_molecules",
  "css3d_orthographic",
  "css3d_periodictable",
  "css3d_sandbox",
  "css3d_sprites",
  "css3d_youtube",
  "games_fps",
  "physics_rapier_basic",
  "physics_rapier_character_controller",
  "physics_rapier_instancing",
  "physics_rapier_joints",
  "physics_rapier_terrain",
  "physics_rapier_vehicle_controller",
  "physics_ammo_instancing",
  "physics_ammo_terrain",
  "physics_ammo_break",
  "physics_ammo_cloth",
  "physics_ammo_rope",
  "physics_ammo_volume",
  "physics_jolt_instancing",
  "webgl_animation_keyframes",
  "webgl_animation_multiple",
  "webgl_animation_skinning_additive_blending",
  "webgl_animation_skinning_blending",
  "webgl_animation_skinning_ik",
  "webgl_animation_skinning_morph",
  "webgl_animation_walk",
  "webgl_buffergeometry",
  "webgl_buffergeometry_indexed",
  "webgl_buffergeometry_lines",
  "webgl_buffergeometry_lines_indexed",
  "webgl_camera",
  "webgpu_camera",
  "webgl_lines_colors",
  "webgl_loader_obj",
  "webgl_loader_gltf",
  "webgl_loader_gltf_instancing",
  "webgl_loader_gltf_progressive_lod",
  "webgl_loader_gltf_variants",
  "webgl_loader_bvh",
  "webgl_loader_texture_dds",
  "webgl_loader_imagebitmap",
  "webgl_loader_nrrd",
  "webgl_loader_texture_tga",
  "webgl_loader_ttf",
  "webgl_loader_vox",
  "webgl_loader_gcode",
  "webgl_loader_pdb",
  "webgl_loader_ply",
  "webgl_loader_pcd",
  "webgl_loader_stl",
  "webgl_loader_xyz",
  "webgl_loader_svg",
  "webgl_materials_video",
  "webgl_materials_video_webcam",
  "webgpu_materials_video",
  "webgpu_video_frame",
  "webgpu_video_panorama",
  "webgl_video_kinect",
  "webgl_morphtargets_webcam",
  "webgl_video_panorama_equirectangular",
  "webgl_worker_offscreencanvas",
  "webxr_xr_cubes",
  "webxr_xr_controls_transform",
  "webxr_xr_dragging",
  "webxr_xr_haptics",
  "webxr_vr_handinput",
  "webgl_batch_lod_bvh",
  "webgl_buffergeometry_attributes_integer",
  "webgl_buffergeometry_attributes_none",
  "webgl_buffergeometry_drawrange",
  "webgl_buffergeometry_instancing",
  "webgl_buffergeometry_instancing_interleaved",
  "webgl_buffergeometry_selective_draw",
  "webgl_geometry_convex",
  "webgl_geometry_extrude_splines",
  "webgl_geometry_minecraft",
  "webgl_geometry_nurbs",
  "webgl_geometry_spline_editor",
  "webgl_geometry_teapot",
  "webgl_geometry_terrain",
  "webgl_geometry_terrain_raycast",
  "webgl_geometry_text",
  "webgl_geometry_text_shapes",
  "webgl_geometry_text_stroke",
  "webgl_marchingcubes",
  "webgl_instancing_dynamic",
  "webgl_instancing_raycast",
  "webgl_interactive_buffergeometry",
  "webgl_interactive_cubes",
  "webgl_interactive_cubes_ortho",
  "webgl_interactive_raycasting_points",
  "webgl_lod",
  "webgl_modifier_curve",
  "webgl_modifier_simplifier",
  "webgl_modifier_subdivision",
  "webgl_modifier_tessellation",
  "webgl_morphtargets",
  "webgl_morphtargets_face",
  "webgl_morphtargets_horse",
  "webgl_morphtargets_sphere",
  "webgl_multiple_elements",
  "webgl_multiple_elements_text",
  "webgl_multiple_scenes_comparison",
  "webgl_multiple_views",
  "webgl_geometries",
  "webgl_geometry_colors",
  "webgl_geometry_cube",
  "webgl_geometry_extrude_shapes",
  "webgl_geometry_shapes",
  "webgl_lights_hemisphere",
  "webgl_math_obb",
  "webgl_panorama_cube",
  "webgl_panorama_equirectangular",
  "webgl_points_billboards",
  "webgl_points_dynamic",
  "webgl_points_waves",
  "webgl_random_uv",
  "webgl_raycaster_bvh",
  "webgl_raycaster_sprite",
  "webgl_raycaster_texture",
  "webgl_shadowmesh",
  "webgl_simple_gi",
  "webgl_sprites",
  "svg_lines",
  "svg_sandbox",
]);

const DIRECT_GEOMETRY = Object.freeze({
  webgl_buffergeometry: {
    indexed: false,
    lines: false,
    colors: false,
    orthographic: false,
  },
  webgl_buffergeometry_indexed: {
    indexed: true,
    lines: false,
    colors: false,
    orthographic: false,
  },
  webgl_buffergeometry_lines: {
    indexed: false,
    lines: true,
    colors: false,
    orthographic: false,
  },
  webgl_buffergeometry_lines_indexed: {
    indexed: true,
    lines: true,
    colors: false,
    orthographic: false,
  },
  webgl_camera: {
    indexed: false,
    lines: false,
    colors: false,
    orthographic: true,
  },
  webgl_lines_colors: {
    indexed: false,
    lines: true,
    colors: true,
    orthographic: false,
  },
});

const BOUNDARIES = Object.freeze({
  animation:
    "THREE animation tracks or skinning are represented by deterministic CPU mesh motion; animation-mixer, skeleton, and asset-clip fidelity are outside this adapter.",
  audio:
    "WebAudio nodes and analyser output are not a canvas scene; the adapter renders an equivalent animated waveform/mesh and records that audio I/O is omitted.",
  buffer:
    "The source BufferGeometry attributes, index, and draw range are represented with a bounded core geometry; GPU attribute/storage semantics are not reproduced.",
  controls:
    "The named THREE control intent is represented with OrbitControls and matching camera constraints where possible; control-specific DOM gestures are an explicit approximation.",
  direct:
    "The direct THREE BufferGeometry primitive, index, line mode, and vertex-color path is represented without claiming pixel identity with the upstream demo.",
  dom: "CSS2D/CSS3D/SVG DOM overlays cannot be drawn into this WebGL comparison canvas; the adapter shows the closest THREE mesh layout and omits DOM/media interaction.",
  exporter:
    "Exporter examples are side-effect/API demonstrations; the adapter renders the source mesh while intentionally omitting file serialization and download.",
  geometry:
    "The source geometry/modifier is represented by a bounded THREE core primitive or mesh arrangement; add-on loaders, shaders, and exact tessellation may differ.",
  game: "The game adapter shows the first-person THREE scene and camera; pointer-lock input, game assets, and gameplay state are intentionally not simulated.",
  interactive:
    "The source picking/selection interaction is represented by a deterministic THREE mesh arrangement and pointer highlight; application callbacks are not replayed.",
  instancing:
    "The source InstancedMesh/instance-attribute behavior is represented by deterministic core meshes with synchronized transforms; GPU instance buffers are not part of the comparison contract.",
  lighting:
    "The source light/shadow or indirect-light behavior is represented by core ambient and directional lighting; shadow maps, probes, and GPU light transport are omitted.",
  loader:
    "Asset-loader/network/device boundaries are omitted; a deterministic THREE core primitive stands in for the loaded asset so the comparison remains canvas-backed and explicit.",
  math: "The source math helper is visualized with a core THREE wireframe/mesh arrangement; numeric helper internals and external overlays are not reproduced.",
  media:
    "The source video, webcam, frame, or worker surface is represented by a deterministic core THREE mesh; media permissions, decode timing, and worker ownership remain browser boundaries.",
  panorama:
    "Panorama/image assets are not fetched for the comparison; a bounded THREE wireframe sphere/box communicates the camera and projection boundary.",
  physics:
    "Rapier simulation and collision state are not part of THREE core; the adapter renders a deterministic rigid-body arrangement and records physics as a boundary.",
  points:
    "Point/particle behavior is represented with deterministic THREE Points; source GPU particle buffers, billboards, and texture maps are not guaranteed pixel-identical.",
  proxy:
    "This source is inherently non-canvas or device/asset-bound; the adapter intentionally renders the nearest THREE core mesh and records the omitted boundary instead of showing an unrelated scene silently.",
  raycaster:
    "THREE core geometry and a visible ray proxy are rendered; source BVH/picking acceleration and app-specific hit callbacks are omitted.",
  sprite:
    "Sprite/billboard intent is represented with camera-facing core meshes; source texture loading and sprite-specific interaction are omitted.",
  webgpu:
    "The WebGPU source is explicitly approximated with THREE WebGLRenderer, CPU-sized deterministic geometry, and the same dual-camera/scissor concept; WebGPU device behavior is not reproduced.",
  xr: "The WebXR source is represented by deterministic Canvas2D-visible meshes and desktop fallback controls; XR session, device pose, framebuffer submission, and haptics remain browser/device boundaries.",
});

const DEFAULT_RUNTIME = Object.freeze({
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CameraHelper,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  WebGLRenderer,
  OrbitControls,
});

function classifyAdapter(id) {
  if (DIRECT_GEOMETRY[id])
    return { kind: "direct", direct: DIRECT_GEOMETRY[id] };
  if (id === "webgpu_camera") return { kind: "webgpu" };
  if (id.startsWith("misc_controls_")) {
    return { kind: "controls", control: id.slice("misc_controls_".length) };
  }
  if (id === "misc_animation_groups" || id === "misc_animation_keys") {
    return { kind: "animation" };
  }
  if (id === "misc_raycaster_helper") return { kind: "raycaster" };
  if (id === "misc_boxselection") return { kind: "interactive" };
  if (id === "misc_uv_tests") return { kind: "geometry" };
  if (id.startsWith("misc_exporter_")) return { kind: "exporter" };
  if (id.startsWith("webaudio_")) return { kind: "audio" };
  if (id.startsWith("css") || id.startsWith("svg_")) return { kind: "dom" };
  if (id === "games_fps") return { kind: "game" };
  if (id.startsWith("physics_")) return { kind: "physics" };
  if (id.startsWith("webxr_")) return { kind: "xr" };
  if (
    id.startsWith("webgl_animation_") ||
    id.startsWith("webgl_morphtargets")
  ) {
    return { kind: "animation" };
  }
  if (id.startsWith("webgl_loader_")) return { kind: "loader" };
  if (
    id.includes("materials_video") ||
    id.includes("video_frame") ||
    id.includes("video_panorama") ||
    id.includes("video_kinect") ||
    id.includes("morphtargets_webcam") ||
    id.includes("worker_offscreencanvas")
  ) {
    return { kind: "media" };
  }
  if (id.startsWith("webgl_buffergeometry")) return { kind: "buffer" };
  if (id === "webgl_lines_colors") return { kind: "direct" };
  if (id.includes("instancing")) return { kind: "instancing" };
  if (id.includes("interactive")) return { kind: "interactive" };
  if (id.includes("raycaster")) return { kind: "raycaster" };
  if (id === "webgl_lod" || id.includes("batch_lod"))
    return { kind: "geometry" };
  if (id.startsWith("webgl_modifier_")) return { kind: "geometry" };
  if (id.includes("panorama")) return { kind: "panorama" };
  if (id.includes("points_")) return { kind: "points" };
  if (id.endsWith("_sprites")) return { kind: "sprite" };
  if (
    id.includes("lights_") ||
    id.includes("shadowmesh") ||
    id.includes("simple_gi")
  ) {
    return { kind: "lighting" };
  }
  if (id.includes("math_")) return { kind: "math" };
  if (id.startsWith("webgl_geometry_")) {
    if (id.includes("text")) return { kind: "geometry", text: true };
    return { kind: "geometry" };
  }
  if (id === "webgl_marchingcubes" || id === "webgl_geometries") {
    return { kind: "geometry" };
  }
  return { kind: "proxy" };
}

/**
 * Per-ID metadata is intentionally materialized rather than inferred at mount
 * time. It gives tests and the viewer a stable coverage contract and records
 * why a non-identical scene is still a valid comparison.
 */
const ADAPTER_DEFINITIONS = Object.fromEntries(
  THREE_COMPARISON_ADAPTER_IDS.map((id) => {
    const classification = classifyAdapter(id);
    return [
      id,
      Object.freeze({
        id,
        ...classification,
        boundary: BOUNDARIES[classification.kind] ?? BOUNDARIES.proxy,
      }),
    ];
  }),
);

export const THREE_ADAPTERS = new Map(
  Object.entries(ADAPTER_DEFINITIONS).map(([id, definition]) => [
    id,
    definition,
  ]),
);

export function getThreeComparisonAdapter(exampleId) {
  return THREE_ADAPTERS.get(exampleId);
}

export function hasThreeComparisonAdapter(exampleId) {
  return THREE_ADAPTERS.has(exampleId);
}

function addLighting(scene, runtime, kind) {
  if (kind === "audio") return;
  scene.add(new runtime.AmbientLight(0xffffff, 0.42));
  const light = new runtime.DirectionalLight(0xffffff, 0.9);
  light.position.set(3, 5, 6);
  scene.add(light);
}

function createDirectGeometry(runtime, options) {
  const geometry = new runtime.BufferGeometry();
  const positions = options.lines
    ? [-2.6, -1.4, 0, 2.6, -1.4, 0, -2.6, 1.4, 0, 2.6, 1.4, 0]
    : [-1.8, -1.2, 0, 1.8, -1.2, 0, 0, 1.6, 0];
  geometry.setAttribute(
    "position",
    new runtime.Float32BufferAttribute(positions, 3),
  );
  if (options.indexed) {
    geometry.setIndex(options.lines ? [0, 1, 2, 3] : [0, 1, 2]);
  }
  if (options.colors) {
    geometry.setAttribute(
      "color",
      new runtime.Float32BufferAttribute(
        [1, 0.25, 0.25, 0.25, 0.9, 1, 0.4, 1, 0.35, 1, 0.8, 0.2],
        3,
      ),
    );
  }
  geometry.computeVertexNormals?.();
  return geometry;
}

function createPointGeometry(runtime, count = 320) {
  const positions = new Float32Array(count * 3);
  let state = 0x12345678;
  for (let index = 0; index < positions.length; index++) {
    state = (1664525 * state + 1013904223) >>> 0;
    positions[index] = ((state / 0x100000000) * 2 - 1) * 2.7;
  }
  const geometry = new runtime.BufferGeometry();
  geometry.setAttribute(
    "position",
    new runtime.Float32BufferAttribute(positions, 3),
  );
  return geometry;
}

function fallbackGeometry(runtime, name, args) {
  const GeometryConstructor = runtime[name] ?? runtime.SphereGeometry;
  return new GeometryConstructor(...args);
}

function addMesh(
  runtime,
  scene,
  state,
  geometry,
  color,
  position = [0, 0, 0],
  options = {},
) {
  const MaterialConstructor = options.basic
    ? runtime.MeshBasicMaterial
    : runtime.MeshLambertMaterial;
  const material = new MaterialConstructor({ color, ...options.material });
  const mesh = new runtime.Mesh(geometry, material);
  mesh.position.set(...position);
  scene.add(mesh);
  state.objects.push(mesh);
  return mesh;
}

function addPrimitiveGallery(runtime, scene, state, definition) {
  const palette = [0xe46d62, 0x56a6d9, 0xf1bc58, 0x8fd080, 0xc983d1, 0xd88755];
  const geometries = [
    ["BoxGeometry", [1.05, 1.05, 1.05]],
    ["SphereGeometry", [0.72, 18, 12]],
    ["ConeGeometry", [0.72, 1.35, 18]],
    ["CylinderGeometry", [0.6, 0.82, 1.3, 18]],
    ["TorusGeometry", [0.58, 0.2, 12, 20]],
    ["TorusKnotGeometry", [0.58, 0.18, 28, 8]],
  ];
  const objects = geometries.map(([name, args], index) =>
    addMesh(
      runtime,
      scene,
      state,
      fallbackGeometry(runtime, name, args),
      palette[index],
      [((index % 3) - 1) * 2.1, (Math.floor(index / 3) - 0.5) * 2.1, 0],
    ),
  );
  state.tick = (elapsed) => {
    for (const [index, object] of objects.entries()) {
      object.rotation.x = elapsed * (0.25 + index * 0.015);
      object.rotation.y = elapsed * (0.4 + index * 0.02);
    }
  };
  if (definition.text) {
    scene.userData.comparisonFeature =
      "text geometry represented by block primitives";
  }
}

function addTextBlocks(runtime, scene, state) {
  const glyphs = {
    E: ["1111", "1000", "1110", "1000", "1111"],
    A: ["0110", "1001", "1111", "1001", "1001"],
    S: ["0111", "1000", "0110", "0001", "1110"],
    L: ["1000", "1000", "1000", "1000", "1111"],
  };
  const cubeGeometry = fallbackGeometry(
    runtime,
    "BoxGeometry",
    [0.17, 0.17, 0.3],
  );
  const root = new runtime.Group();
  scene.add(root);
  state.objects.push(root);
  const text = "EASEL";
  for (let letterIndex = 0; letterIndex < text.length; letterIndex++) {
    const pattern = glyphs[text[letterIndex]] ?? glyphs.E;
    for (let row = 0; row < pattern.length; row++) {
      for (let column = 0; column < pattern[row].length; column++) {
        if (pattern[row][column] !== "1") continue;
        const mesh = new runtime.Mesh(
          cubeGeometry,
          new runtime.MeshLambertMaterial({ color: 0x67c5e5 }),
        );
        mesh.position.set(
          (letterIndex - 2) * 1.1 + (column - 1.5) * 0.2,
          (2 - row) * 0.2,
          0,
        );
        root.add(mesh);
      }
    }
  }
  state.tick = (elapsed) => {
    root.rotation.y = elapsed * 0.25;
  };
}

function addPoints(runtime, scene, state, definition) {
  const geometry = createPointGeometry(
    runtime,
    definition.id.includes("dynamic") ? 480 : 320,
  );
  const points = new runtime.Points(
    geometry,
    new runtime.PointsMaterial({
      color: 0x8fd8ff,
      size: definition.id.includes("billboards") ? 0.08 : 0.055,
    }),
  );
  scene.add(points);
  state.objects.push(points);
  state.tick = (elapsed) => {
    points.rotation.y = elapsed * 0.18;
    if (definition.id.includes("waves"))
      points.position.y = Math.sin(elapsed * 1.5) * 0.25;
  };
}

function addControls(runtime, scene, state, definition) {
  const knot = addMesh(
    runtime,
    scene,
    state,
    fallbackGeometry(runtime, "TorusKnotGeometry", [1.05, 0.28, 48, 10]),
    0x588fd4,
  );
  const marker = addMesh(
    runtime,
    scene,
    state,
    fallbackGeometry(runtime, "SphereGeometry", [0.28, 14, 10]),
    0xf2ba55,
    [0, 1.8, 0],
  );
  state.tick = (elapsed) => {
    knot.rotation.y = elapsed * 0.35;
    marker.position.x = Math.sin(elapsed * 0.8) * 1.6;
  };
  state.controlSettings = {
    mode: definition.control,
    enableDamping:
      definition.control !== "fly" && definition.control !== "pointerlock",
    enableRotate: definition.control !== "map",
    enablePan: definition.control !== "pointerlock",
  };
}

function addInstancing(runtime, scene, state) {
  const boxes = [];
  for (let index = 0; index < 9; index++) {
    const angle = (index / 9) * Math.PI * 2;
    boxes.push(
      addMesh(
        runtime,
        scene,
        state,
        fallbackGeometry(runtime, "BoxGeometry", [0.34, 0.34, 0.34]),
        0x6dc6dd + index * 0x040700,
        [Math.cos(angle) * 1.75, Math.sin(angle) * 1.2, 0],
      ),
    );
  }
  state.tick = (elapsed) => {
    for (const [index, box] of boxes.entries()) {
      box.rotation.x = elapsed * 0.4 + index * 0.1;
      box.rotation.y = elapsed * 0.55 + index * 0.08;
    }
  };
}

function addInteractive(runtime, scene, state, definition) {
  const objects = [];
  for (let index = 0; index < 4; index++) {
    objects.push(
      addMesh(
        runtime,
        scene,
        state,
        fallbackGeometry(runtime, "BoxGeometry", [0.9, 0.9, 0.9]),
        [0xe06b65, 0x6eb3d6, 0x89c77d, 0xd49ad9][index],
        [((index % 2) - 0.5) * 2.2, (Math.floor(index / 2) - 0.5) * 2.2, 0],
      ),
    );
  }
  state.tick = (elapsed) => {
    for (const [index, object] of objects.entries()) {
      object.rotation.y = elapsed * (0.2 + index * 0.05);
    }
  };
  if (definition.id.includes("ortho")) state.camera = "orthographic";
  state.pointerHandler = (event) => {
    const index = Math.max(
      0,
      Math.min(objects.length - 1, Math.floor((event.offsetX ?? 0) / 160)),
    );
    const material = objects[index]?.material;
    material?.color?.set?.(0xffffff);
  };
}

function addRaycaster(runtime, scene, state, definition) {
  const target = addMesh(
    runtime,
    scene,
    state,
    fallbackGeometry(runtime, "SphereGeometry", [1.1, 20, 14]),
    0x69b5e8,
  );
  const rayGeometry = new runtime.BufferGeometry();
  rayGeometry.setAttribute(
    "position",
    new runtime.Float32BufferAttribute([-3, -1.7, 2, 0, 0, 0, 3, 1.7, -2], 3),
  );
  const ray = new runtime.LineSegments(
    rayGeometry,
    new runtime.LineBasicMaterial({ color: 0xf2bf55 }),
  );
  scene.add(ray);
  state.objects.push(ray);
  state.tick = (elapsed) => {
    target.rotation.y = elapsed * 0.3;
    ray.rotation.z = Math.sin(elapsed * 0.7) * 0.25;
  };
  state.pointerHandler = () => {
    target.material?.color?.set?.(0xf4d35e);
  };
  if (definition.id.includes("texture")) {
    scene.userData.comparisonFeature =
      "texture raycast represented by a visible ray proxy";
  }
}

function addLoader(runtime, scene, state, definition) {
  const primary = addMesh(
    runtime,
    scene,
    state,
    fallbackGeometry(
      runtime,
      definition.id.includes("gltf")
        ? "TorusKnotGeometry"
        : "IcosahedronGeometry",
      [0.95, 1],
    ),
    0x76bad8,
  );
  const secondary = addMesh(
    runtime,
    scene,
    state,
    fallbackGeometry(runtime, "BoxGeometry", [0.65, 0.65, 0.65]),
    0xe9a75d,
    [1.5, 0.5, 0],
  );
  state.tick = (elapsed) => {
    primary.rotation.y = elapsed * 0.3;
    secondary.rotation.x = elapsed * 0.45;
    secondary.rotation.z = elapsed * 0.2;
  };
}

function addPanorama(runtime, scene, state, definition) {
  const geometry = fallbackGeometry(runtime, "SphereGeometry", [3.2, 24, 16]);
  const mesh = addMesh(runtime, scene, state, geometry, 0x376b8d, [0, 0, 0], {
    basic: true,
    material: { wireframe: true },
  });
  state.tick = (elapsed) => {
    mesh.rotation.y = elapsed * 0.08;
  };
  scene.userData.comparisonFeature = definition.id.includes("cube")
    ? "cube panorama represented by a wireframe spherical projection"
    : "equirectangular panorama represented by a wireframe spherical projection";
}

function addSprite(runtime, scene, state) {
  const meshes = [];
  for (let index = 0; index < 7; index++) {
    meshes.push(
      addMesh(
        runtime,
        scene,
        state,
        fallbackGeometry(runtime, "BoxGeometry", [0.36, 0.36, 0.06]),
        0xd26db4 + index * 0x050500,
        [((index % 4) - 1.5) * 1.1, (Math.floor(index / 4) - 0.5) * 1.1, 0],
        { basic: true },
      ),
    );
  }
  state.tick = (elapsed) => {
    for (const [index, mesh] of meshes.entries()) {
      mesh.rotation.z = Math.sin(elapsed * 0.7 + index) * 0.25;
    }
  };
}

function addLightingScene(runtime, scene, state, definition) {
  const objects = [
    addMesh(
      runtime,
      scene,
      state,
      fallbackGeometry(runtime, "SphereGeometry", [0.8, 18, 12]),
      0xf5ca63,
      [-1.25, 0.15, 0],
    ),
    addMesh(
      runtime,
      scene,
      state,
      fallbackGeometry(runtime, "BoxGeometry", [1.2, 1.2, 1.2]),
      0x66b7db,
      [1.25, 0.15, 0],
    ),
  ];
  if (definition.id.includes("hemisphere"))
    scene.userData.comparisonFeature =
      "hemisphere light approximated with ambient plus directional light";
  state.tick = (elapsed) => {
    for (const [index, object] of objects.entries())
      object.rotation.y = elapsed * (0.25 + index * 0.15);
  };
}

function addPhysicsScene(runtime, scene, state, definition) {
  const floor = addMesh(
    runtime,
    scene,
    state,
    fallbackGeometry(runtime, "BoxGeometry", [4.5, 0.2, 2.8]),
    0x596277,
    [0, -1.55, 0],
  );
  const bodies = [];
  for (let index = 0; index < 4; index++) {
    bodies.push(
      addMesh(
        runtime,
        scene,
        state,
        fallbackGeometry(
          runtime,
          index === 0 ? "CapsuleGeometry" : "BoxGeometry",
          index === 0 ? [0.33, 0.7, 8, 12] : [0.55, 0.55, 0.55],
        ),
        0x8ac6d3 + index * 0x050a03,
        [(index - 1.5) * 1.05, -0.7 + index * 0.3, 0],
      ),
    );
  }
  state.tick = (elapsed) => {
    floor.rotation.y = Math.sin(elapsed * 0.2) * 0.03;
    for (const [index, body] of bodies.entries()) {
      body.position.y =
        -0.65 +
        index * 0.28 +
        Math.abs(Math.sin(elapsed * (0.8 + index * 0.08))) * 0.2;
      body.rotation.z = elapsed * (0.25 + index * 0.05);
    }
  };
  scene.userData.comparisonFeature = definition.id.includes("character")
    ? "character controller represented by a bounded rigid-body proxy"
    : "Rapier rigid bodies represented by deterministic core meshes";
}

function addAudioScene(runtime, scene, state) {
  addPoints(runtime, scene, state, { id: "webaudio_visualizer" });
  const ring = addMesh(
    runtime,
    scene,
    state,
    fallbackGeometry(runtime, "TorusGeometry", [1.15, 0.08, 12, 32]),
    0x8fe0c1,
    [0, 0, 0],
    { basic: true },
  );
  const tick = state.tick;
  state.tick = (elapsed) => {
    tick?.(elapsed);
    ring.scale.setScalar?.(1 + Math.sin(elapsed * 3) * 0.08);
  };
}

function addGameScene(runtime, scene, state) {
  const player = addMesh(
    runtime,
    scene,
    state,
    fallbackGeometry(runtime, "CapsuleGeometry", [0.35, 0.7, 8, 12]),
    0x76b9da,
    [0, 0, 0],
  );
  addMesh(
    runtime,
    scene,
    state,
    fallbackGeometry(runtime, "BoxGeometry", [5, 0.2, 5]),
    0x41495d,
    [0, -1.5, 0],
  );
  state.tick = (elapsed) => {
    player.position.x = Math.sin(elapsed * 0.45) * 1.4;
    player.rotation.y = elapsed * 0.3;
  };
}

function addProxyScene(runtime, scene, state) {
  const object = addMesh(
    runtime,
    scene,
    state,
    fallbackGeometry(runtime, "TorusKnotGeometry", [1.05, 0.28, 48, 10]),
    0x9c86d8,
  );
  state.tick = (elapsed) => {
    object.rotation.x = elapsed * 0.2;
    object.rotation.y = elapsed * 0.35;
  };
}

function buildSceneObjects(runtime, scene, state, definition) {
  switch (definition.kind) {
    case "direct": {
      const geometry = createDirectGeometry(runtime, definition.direct);
      const object = definition.direct.lines
        ? new runtime.LineSegments(
            geometry,
            new runtime.LineBasicMaterial({
              color: definition.direct.colors ? 0xffffff : 0x6ec8ff,
              vertexColors: definition.direct.colors,
            }),
          )
        : new runtime.Mesh(
            geometry,
            new runtime.MeshLambertMaterial({ color: 0xe29a56 }),
          );
      scene.add(object);
      state.objects.push(object);
      state.tick = (elapsed) => {
        object.rotation.y = elapsed * 0.35;
      };
      break;
    }
    case "buffer": {
      const options = {
        indexed: definition.id.includes("indexed"),
        lines: definition.id.includes("lines"),
        colors: definition.id.includes("colors"),
      };
      const geometry = createDirectGeometry(runtime, options);
      const object = options.lines
        ? new runtime.LineSegments(
            geometry,
            new runtime.LineBasicMaterial({ color: 0x6ec8ff }),
          )
        : new runtime.Mesh(
            geometry,
            new runtime.MeshLambertMaterial({ color: 0xd28d56 }),
          );
      scene.add(object);
      state.objects.push(object);
      state.tick = (elapsed) => {
        object.rotation.y = elapsed * 0.4;
      };
      break;
    }
    case "controls":
      addControls(runtime, scene, state, definition);
      break;
    case "animation":
      addPrimitiveGallery(runtime, scene, state, definition);
      break;
    case "points":
      addPoints(runtime, scene, state, definition);
      break;
    case "geometry":
      if (definition.text) addTextBlocks(runtime, scene, state);
      else addPrimitiveGallery(runtime, scene, state, definition);
      break;
    case "instancing":
      addInstancing(runtime, scene, state, definition);
      break;
    case "interactive":
      addInteractive(runtime, scene, state, definition);
      break;
    case "raycaster":
      addRaycaster(runtime, scene, state, definition);
      break;
    case "loader":
      addLoader(runtime, scene, state, definition);
      break;
    case "panorama":
      addPanorama(runtime, scene, state, definition);
      break;
    case "sprite":
      addSprite(runtime, scene, state);
      break;
    case "lighting":
      addLightingScene(runtime, scene, state, definition);
      break;
    case "math":
      addRaycaster(runtime, scene, state, definition);
      break;
    case "physics":
      addPhysicsScene(runtime, scene, state, definition);
      break;
    case "audio":
      addAudioScene(runtime, scene, state);
      break;
    case "game":
      addGameScene(runtime, scene, state);
      break;
    default:
      if (definition.kind === "exporter") {
        addPrimitiveGallery(runtime, scene, state, definition);
      } else {
        addProxyScene(runtime, scene, state);
      }
      break;
  }
}

function canvasDimensions(canvas) {
  return {
    width: Math.max(1, Number(canvas?.width) || 640),
    height: Math.max(1, Number(canvas?.height) || 360),
  };
}

function configureRenderer(renderer, width, height) {
  renderer.setPixelRatio?.(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.setSize?.(width, height, false);
}

function createCamera(runtime, definition, width, height) {
  const aspect = width / height;
  const orthographic =
    definition.direct?.orthographic ||
    definition.camera === "orthographic" ||
    definition.id.includes("_ortho");
  const camera = orthographic
    ? new runtime.OrthographicCamera(-4 * aspect, 4 * aspect, 4, -4, 0.1, 100)
    : new runtime.PerspectiveCamera(45, aspect, 0.1, 100);
  camera.position.set(0, 0.4, definition.kind === "panorama" ? 7.5 : 6.5);
  camera.lookAt?.(0, 0, 0);
  return { camera, orthographic };
}

function resizeComparison(renderer, cameraState, canvas, previous) {
  const { width, height } = canvasDimensions(canvas);
  if (width === previous.width && height === previous.height) return previous;
  renderer.setSize?.(width, height, false);
  if (cameraState.orthographic) {
    const heightScale = 4;
    const aspect = width / height;
    cameraState.camera.left = -heightScale * aspect;
    cameraState.camera.right = heightScale * aspect;
    cameraState.camera.top = heightScale;
    cameraState.camera.bottom = -heightScale;
  } else {
    cameraState.camera.aspect = width / height;
  }
  cameraState.camera.updateProjectionMatrix?.();
  return { width, height };
}

function startFrameLoop(render) {
  let active = true;
  let frame;
  const request = globalThis.requestAnimationFrame;
  const tick = () => {
    if (!active) return;
    render();
    if (typeof request === "function") frame = request(tick);
  };
  tick();
  return {
    stop() {
      if (!active) return;
      active = false;
      if (
        frame !== undefined &&
        typeof globalThis.cancelAnimationFrame === "function"
      ) {
        globalThis.cancelAnimationFrame(frame);
      }
    },
  };
}

function disposeScene(scene) {
  const geometries = new Set();
  const materials = new Set();
  scene.traverse?.((object) => {
    if (object.geometry?.dispose) geometries.add(object.geometry);
    if (Array.isArray(object.material)) {
      for (const material of object.material)
        if (material?.dispose) materials.add(material);
    } else if (object.material?.dispose) {
      materials.add(object.material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

function setupControls(runtime, camera, canvas, state) {
  if (!state.controlSettings || typeof runtime.OrbitControls !== "function")
    return;
  let controls;
  try {
    controls = new runtime.OrbitControls(camera, canvas);
  } catch {
    return;
  }
  Object.assign(controls, state.controlSettings);
  controls.target?.set?.(0, 0, 0);
  controls.update?.();
  return controls;
}

function setupCoreComparison(canvas, definition, runtime) {
  const dimensions = canvasDimensions(canvas);
  const renderer = new runtime.WebGLRenderer({ canvas, antialias: true });
  configureRenderer(renderer, dimensions.width, dimensions.height);
  const scene = new runtime.Scene();
  scene.background = new runtime.Color(0x101722);
  scene.userData = {
    comparisonExampleId: definition.id,
    comparisonKind: definition.kind,
    comparisonBoundary: definition.boundary,
  };
  addLighting(scene, runtime, definition.kind);
  const cameraState = createCamera(
    runtime,
    definition,
    dimensions.width,
    dimensions.height,
  );
  const state = {
    objects: [],
    tick: undefined,
    controlSettings: undefined,
    pointerHandler: undefined,
  };
  buildSceneObjects(runtime, scene, state, definition);
  const controls = setupControls(runtime, cameraState.camera, canvas, state);
  const onPointer = state.pointerHandler;
  if (onPointer && typeof canvas.addEventListener === "function")
    canvas.addEventListener("pointermove", onPointer);
  let size = dimensions;
  const started = Date.now();
  const render = () => {
    size = resizeComparison(renderer, cameraState, canvas, size);
    const elapsed = (Date.now() - started) * 0.001;
    state.tick?.(elapsed);
    controls?.update?.();
    renderer.render(scene, cameraState.camera);
  };
  const loop = startFrameLoop(render);
  let cleaned = false;
  return {
    update() {
      if (cleaned) return;
      render();
    },
    cleanup() {
      if (cleaned) return;
      cleaned = true;
      loop.stop();
      if (onPointer && typeof canvas.removeEventListener === "function")
        canvas.removeEventListener("pointermove", onPointer);
      controls?.dispose?.();
      disposeScene(scene);
      renderer.dispose?.();
    },
  };
}

function createComparisonPointGeometry(runtime) {
  return createPointGeometry(runtime, 600);
}

function setupWebgpuCameraComparison(canvas, runtime, definition) {
  let { width, height } = canvasDimensions(canvas);
  const aspect = () => width / height;
  const renderer = new runtime.WebGLRenderer({ canvas, antialias: true });
  configureRenderer(renderer, width, height);
  renderer.setScissorTest?.(true);
  const scene = new runtime.Scene();
  scene.userData = {
    comparisonExampleId: definition.id,
    comparisonKind: definition.kind,
    comparisonBoundary: definition.boundary,
  };
  const camera = new runtime.PerspectiveCamera(50, 0.5 * aspect(), 1, 10000);
  camera.position.z = 2500;
  const cameraPerspective = new runtime.PerspectiveCamera(
    50,
    0.5 * aspect(),
    150,
    1000,
  );
  const cameraPerspectiveHelper = new runtime.CameraHelper(cameraPerspective);
  scene.add(cameraPerspectiveHelper);
  const frustumSize = 600;
  const cameraOrtho = new runtime.OrthographicCamera(
    (-0.5 * frustumSize * aspect()) / 2,
    (0.5 * frustumSize * aspect()) / 2,
    frustumSize / 2,
    -frustumSize / 2,
    150,
    1000,
  );
  const cameraOrthoHelper = new runtime.CameraHelper(cameraOrtho);
  scene.add(cameraOrthoHelper);
  let activeCamera = cameraPerspective;
  let activeHelper = cameraPerspectiveHelper;
  cameraPerspective.rotation.y = Math.PI;
  cameraOrtho.rotation.y = Math.PI;
  const cameraRig = new runtime.Group();
  cameraRig.add(cameraPerspective, cameraOrtho);
  scene.add(cameraRig);
  const mesh = new runtime.Mesh(
    new runtime.SphereGeometry(100, 16, 8),
    new runtime.MeshBasicMaterial({ color: 0xffffff, wireframe: true }),
  );
  scene.add(mesh);
  const mesh2 = new runtime.Mesh(
    new runtime.SphereGeometry(50, 16, 8),
    new runtime.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }),
  );
  mesh2.position.y = 150;
  mesh.add(mesh2);
  const mesh3 = new runtime.Mesh(
    new runtime.SphereGeometry(5, 16, 8),
    new runtime.MeshBasicMaterial({ color: 0x0000ff, wireframe: true }),
  );
  mesh3.position.z = 150;
  cameraRig.add(mesh3);
  const pointGeometry = createComparisonPointGeometry(runtime);
  const particles = new runtime.Points(
    pointGeometry,
    new runtime.PointsMaterial({ color: 0xffffff }),
  );
  scene.add(particles);

  function updateSize() {
    const next = canvasDimensions(canvas);
    if (next.width === width && next.height === height) return;
    width = next.width;
    height = next.height;
    renderer.setSize?.(width, height, false);
    camera.aspect = 0.5 * aspect();
    camera.updateProjectionMatrix?.();
    cameraPerspective.aspect = 0.5 * aspect();
    cameraPerspective.updateProjectionMatrix?.();
    cameraOrtho.left = (-0.5 * frustumSize * aspect()) / 2;
    cameraOrtho.right = (0.5 * frustumSize * aspect()) / 2;
    cameraOrtho.top = frustumSize / 2;
    cameraOrtho.bottom = -frustumSize / 2;
    cameraOrtho.updateProjectionMatrix?.();
  }

  function render() {
    updateSize();
    const time = Date.now() * 0.0005;
    mesh.position.x = 700 * Math.cos(time);
    mesh.position.z = 700 * Math.sin(time);
    mesh.position.y = 700 * Math.sin(time);
    mesh2.position.x = 70 * Math.cos(2 * time);
    mesh2.position.z = 70 * Math.sin(time);
    cameraRig.lookAt?.(mesh.position);
    scene.updateMatrixWorld?.(true);
    if (activeCamera === cameraPerspective) {
      cameraPerspective.fov = 35 + 30 * Math.sin(0.5 * time);
      cameraPerspective.far = mesh.position.length();
      cameraPerspective.updateProjectionMatrix?.();
      cameraPerspectiveHelper.update?.();
      cameraPerspectiveHelper.visible = true;
      cameraOrthoHelper.visible = false;
    } else {
      cameraOrtho.far = mesh.position.length();
      cameraOrtho.updateProjectionMatrix?.();
      cameraOrthoHelper.update?.();
      cameraOrthoHelper.visible = true;
      cameraPerspectiveHelper.visible = false;
    }
    activeHelper.visible = false;
    renderer.setClearColor?.(0x000000, 1);
    renderer.setScissor?.(0, 0, width / 2, height);
    renderer.setViewport?.(0, 0, width / 2, height);
    renderer.render(scene, activeCamera);
    activeHelper.visible = true;
    renderer.setClearColor?.(0x111111, 1);
    renderer.setScissor?.(width / 2, 0, width / 2, height);
    renderer.setViewport?.(width / 2, 0, width / 2, height);
    renderer.render(scene, camera);
  }

  const onKeyDown = (event) => {
    if (event.key?.toLowerCase() === "o") {
      activeCamera = cameraOrtho;
      activeHelper = cameraOrthoHelper;
    } else if (event.key?.toLowerCase() === "p") {
      activeCamera = cameraPerspective;
      activeHelper = cameraPerspectiveHelper;
    }
  };
  globalThis.document?.addEventListener?.("keydown", onKeyDown);
  const loop = startFrameLoop(render);
  let cleaned = false;
  return {
    update() {
      if (!cleaned) render();
    },
    cleanup() {
      if (cleaned) return;
      cleaned = true;
      loop.stop();
      globalThis.document?.removeEventListener?.("keydown", onKeyDown);
      disposeScene(scene);
      cameraPerspectiveHelper.dispose?.();
      cameraOrthoHelper.dispose?.();
      renderer.dispose?.();
    },
  };
}

/**
 * Mount the explicit paired adapter for a registered example. The optional
 * runtime argument is intentionally supported for deterministic lifecycle
 * tests; the website uses the default THREE runtime.
 */
export function setupThreeComparison(canvas, exampleId, runtimeOverrides) {
  const definition = THREE_ADAPTERS.get(exampleId);
  if (!definition) {
    throw new Error(
      `No paired THREE.js comparison adapter is registered for ${exampleId}.`,
    );
  }
  const runtime = runtimeOverrides
    ? { ...DEFAULT_RUNTIME, ...runtimeOverrides }
    : DEFAULT_RUNTIME;
  if (definition.kind === "webgpu")
    return setupWebgpuCameraComparison(canvas, runtime, definition);
  return setupCoreComparison(canvas, definition, runtime);
}

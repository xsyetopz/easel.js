import {
  AmbientLight,
  Box3,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DEFAULT_UP,
  DirectionalLight,
  GCodeExporter,
  GridHelper,
  LambertMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  SphereGeometry,
  TorusGeometry,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

// Dropdown options (extend as supported by Polyslice profiles)
const PRINTER_OPTIONS = [
  "Ender3",
  "UltimakerS5",
  "PrusaI3MK3S",
  "AnycubicI3Mega",
  "BambuLabP1P",
];
const FILAMENT_OPTIONS = ["GenericPLA", "GenericPETG", "GenericABS"];
const GEOMETRY_OPTIONS = ["Cube", "Cylinder", "Cone", "Sphere", "Torus"];

export const meta = {
  id: "misc_exporter_gcode",
  upstream: "misc_exporter_gcode",
  name: "exporter / gcode",
  category: "misc",
  animated: true,
  description:
    "Place a cube, cylinder, cone, sphere, or torus on a Z-up build plate and slice the selected mesh into G-code text.",
  differences: [
    "EASEL slices with its built-in GCodeExporter, which writes perimeter paths only; three.js loads the external Polyslice library from a CDN, which also applies the printer, filament, and infill settings.",
    "The Printer, Filament, Infill Density, and Infill Pattern controls have no EASEL equivalent and change nothing on the EASEL side; only Layer Height reaches GCodeExporter.",
    "The lil-gui buttons become two select controls: Geometry picks the mesh, and switching Export to Export G-code runs the slicer once.",
    "The export is not downloaded as a .gcode file; both sides log the G-code text length with console.info instead, because the example contract gives the module only a canvas and no place for a status element.",
    "The three.js side still loads Polyslice from cdn.jsdelivr.net, but only when an export is requested, and reports failures with console.error instead of alert().",
    "EASEL bakes Lambert lighting per vertex (Gouraud), so curved shapes show interpolated shading instead of per-pixel lighting.",
  ],
};

/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "printer",
    label: "Printer",
    options: PRINTER_OPTIONS,
    default: "Ender3",
  },
  {
    type: "select",
    key: "filament",
    label: "Filament",
    options: FILAMENT_OPTIONS,
    default: "GenericPLA",
  },
  {
    type: "slider",
    key: "layerHeight",
    label: "Layer Height (mm)",
    min: 0.1,
    max: 0.4,
    step: 0.05,
    default: 0.2,
  },
  {
    type: "slider",
    key: "infillDensity",
    label: "Infill Density (%)",
    min: 0,
    max: 100,
    step: 5,
    default: 20,
  },
  {
    type: "select",
    key: "infillPattern",
    label: "Infill Pattern",
    options: ["grid", "triangles", "hexagons"],
    default: "grid",
  },
  {
    type: "select",
    key: "geometry",
    label: "Geometry",
    options: GEOMETRY_OPTIONS,
    default: "Cube",
  },
  {
    type: "select",
    key: "export",
    label: "Export",
    options: ["Idle", "Export G-code"],
    default: "Idle",
  },
];

export function setup(canvas, params) {
  let mesh;
  let exportAction = params.export ?? "Idle";
  let geometrySelection = params.geometry ?? "Cube";

  const settings = {
    geometryName: "cube",
    printer: params.printer ?? "Ender3",
    filament: params.filament ?? "GenericPLA",
    layerHeight: params.layerHeight ?? 0.2,
    infillDensity: params.infillDensity ?? 20,
    infillPattern: params.infillPattern ?? "grid",
  };

  const previousDefaultUp = DEFAULT_UP.clone();

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const camera = new PerspectiveCamera({
    fov: 70,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1000,
  });
  // Use Z-up coordinate system
  DEFAULT_UP.set(0, 0, 1);
  camera.up.set(0, 0, 1);
  camera.position.set(42, 42, 42);

  const scene = new Scene();
  scene.background = 0xa0a0a0;

  const ambientLight = new AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff, 2.5);
  directionalLight.position.set(0, 200, 100);
  scene.add(directionalLight);

  // Add ground plane for reference (XY plane when Z is up)
  const gridHelper = new GridHelper(220, 10);
  gridHelper.rotation.x = -Math.PI / 2; // rotate from XZ to XY
  scene.add(gridHelper);

  const addGeometry = {
    Cube: addCube,
    Cylinder: addCylinder,
    Cone: addCone,
    Sphere: addSphere,
    Torus: addTorus,
  };
  (addGeometry[geometrySelection] ?? addCube)();

  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(0, 0, 0);
  orbit.update();

  function exportToGCode() {
    // Slice the current mesh directly
    const gcode = new GCodeExporter().parse(mesh, {
      layerHeight: settings.layerHeight,
    });

    // Report the G-code size instead of downloading it
    const name = settings.geometryName || "model";
    console.info(`EASEL ${name}-geometry.gcode: ${gcode.length} characters`);
  }

  function clearScene() {
    if (mesh) {
      mesh.geometry.dispose();
      mesh.material.dispose();
      scene.remove(mesh);
    }
  }

  // Ensure the mesh sits on the XY plane with min Z = 0
  function placeOnXYPlane(object) {
    // Update world matrix so bounding box reflects transforms
    object.updateMatrixWorld(false, true, true);

    const box = new Box3().setFromObject(object);
    const minZ = box.min.z;

    if (Number.isFinite(minZ)) {
      // Shift object upward by -minZ so it rests on z=0
      object.position.z -= minZ;
      object.updateMatrixWorld(false, true, true);
    }
  }

  function addCube() {
    clearScene();

    const material = new LambertMaterial({ color: 0x00cc00 });
    const geometry = new BoxGeometry(10, 10, 10);
    mesh = new Mesh(geometry, material);
    settings.geometryName = "cube";
    placeOnXYPlane(mesh);
    scene.add(mesh);
  }

  function addCylinder() {
    clearScene();

    const material = new LambertMaterial({ color: 0x00cc00 });
    const geometry = new CylinderGeometry(5, 5, 10, 42);
    mesh = new Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    settings.geometryName = "cylinder";
    placeOnXYPlane(mesh);
    scene.add(mesh);
  }

  function addCone() {
    clearScene();

    const material = new LambertMaterial({ color: 0x00cc00 });
    const geometry = new ConeGeometry(5, 10, 42);
    mesh = new Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    settings.geometryName = "cone";
    placeOnXYPlane(mesh);
    scene.add(mesh);
  }

  function addSphere() {
    clearScene();

    const material = new LambertMaterial({ color: 0x00cc00 });
    const geometry = new SphereGeometry(5, 42, 42);
    mesh = new Mesh(geometry, material);
    settings.geometryName = "sphere";
    placeOnXYPlane(mesh);
    scene.add(mesh);
  }

  function addTorus() {
    clearScene();

    const material = new LambertMaterial({ color: 0x00cc00 });
    const geometry = new TorusGeometry(5, 2, 24, 100);
    // EASEL 0.7.0 builds the torus in the XZ plane; three.js builds it in XY.
    geometry.rotateX(Math.PI / 2);
    mesh = new Mesh(geometry, material);
    settings.geometryName = "torus";
    placeOnXYPlane(mesh);
    scene.add(mesh);
  }

  const animation = createExampleAnimationLoop(() => {
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    update(next) {
      for (const key of [
        "printer",
        "filament",
        "layerHeight",
        "infillDensity",
        "infillPattern",
      ]) {
        if (next[key] !== undefined) settings[key] = next[key];
      }
      if (next.geometry !== undefined && next.geometry !== geometrySelection) {
        geometrySelection = next.geometry;
        addGeometry[geometrySelection]?.();
      }
      if (next.export !== undefined && next.export !== exportAction) {
        exportAction = next.export;
        if (exportAction === "Export G-code") exportToGCode();
      }
    },
    cleanup() {
      animation.cleanup();
      orbit.dispose();
      clearScene();
      gridHelper.dispose();
      renderer.dispose();
      DEFAULT_UP.copy(previousDefaultUp);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

EASEL.DEFAULT_UP.set(0, 0, 1);
camera.up.set(0, 0, 1);

const mesh = new EASEL.Mesh(
  new EASEL.BoxGeometry(10, 10, 10),
  new EASEL.LambertMaterial({ color: 0x00cc00 }),
);
mesh.updateMatrixWorld(false, true, true);
const box = new EASEL.Box3().setFromObject(mesh);
mesh.position.z -= box.min.z;

const gcode = new EASEL.GCodeExporter().parse(mesh, { layerHeight: 0.2 });
console.info(\`cube-geometry.gcode: \${gcode.length} characters\`);`;

export const example = { meta, controls, setup, easelSource };

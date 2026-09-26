// Adapted from three.js r186 examples/misc_exporter_gcode.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

// Loaded only when an export is requested, as upstream loads it from the CDN.
const POLYSLICE_URL =
  "https://cdn.jsdelivr.net/npm/@jgphilpott/polyslice@26.4.0/dist/index.browser.esm.js";

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

  const previousDefaultUp = THREE.Object3D.DEFAULT_UP.clone();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const camera = new THREE.PerspectiveCamera(
    70,
    canvas.width / canvas.height,
    1,
    1000,
  );
  // Use Z-up coordinate system
  THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
  camera.up.set(0, 0, 1);
  camera.position.set(42, 42, 42);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
  directionalLight.position.set(0, 200, 100);
  scene.add(directionalLight);

  // Add ground plane for reference (XY plane when Z is up)
  const gridHelper = new THREE.GridHelper(220, 10);
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

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  async function exportToGCode() {
    try {
      // Make THREE available globally for Polyslice
      globalThis.THREE = THREE;
      const { default: Polyslice } = await import(
        /* @vite-ignore */ POLYSLICE_URL
      );

      // Create printer and filament configurations using Polyslice
      const printer = new Polyslice.Printer(settings.printer || "Ender3");
      const filament = new Polyslice.Filament(
        settings.filament || "GenericPLA",
      );

      // Create the slicer instance with user-defined settings
      const slicer = new Polyslice.Polyslice({
        printer: printer,
        filament: filament,
        layerHeight: settings.layerHeight,
        infillPattern: settings.infillPattern,
        infillDensity: settings.infillDensity,
        verbose: true,
      });

      // Slice the current mesh directly
      const gcode = slicer.slice(mesh);

      // Report the G-code size instead of downloading it
      const name = settings.geometryName || "model";
      console.info(
        `three.js ${name}-geometry.gcode: ${gcode.length} characters`,
      );
    } catch (error) {
      console.error("Error exporting to G-code:", error);
    }
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
    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    const minZ = box.min.z;

    if (Number.isFinite(minZ)) {
      // Shift object upward by -minZ so it rests on z=0
      object.position.z -= minZ;
      object.updateMatrixWorld(true);
    }
  }

  function addCube() {
    clearScene();

    const material = new THREE.MeshLambertMaterial({ color: 0x00cc00 });
    const geometry = new THREE.BoxGeometry(10, 10, 10);
    mesh = new THREE.Mesh(geometry, material);
    settings.geometryName = "cube";
    placeOnXYPlane(mesh);
    scene.add(mesh);
  }

  function addCylinder() {
    clearScene();

    const material = new THREE.MeshLambertMaterial({ color: 0x00cc00 });
    const geometry = new THREE.CylinderGeometry(5, 5, 10, 42);
    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    settings.geometryName = "cylinder";
    placeOnXYPlane(mesh);
    scene.add(mesh);
  }

  function addCone() {
    clearScene();

    const material = new THREE.MeshLambertMaterial({ color: 0x00cc00 });
    const geometry = new THREE.ConeGeometry(5, 10, 42);
    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    settings.geometryName = "cone";
    placeOnXYPlane(mesh);
    scene.add(mesh);
  }

  function addSphere() {
    clearScene();

    const material = new THREE.MeshLambertMaterial({ color: 0x00cc00 });
    const geometry = new THREE.SphereGeometry(5, 42, 42);
    mesh = new THREE.Mesh(geometry, material);
    settings.geometryName = "sphere";
    placeOnXYPlane(mesh);
    scene.add(mesh);
  }

  function addTorus() {
    clearScene();

    const material = new THREE.MeshLambertMaterial({ color: 0x00cc00 });
    const geometry = new THREE.TorusGeometry(5, 2, 24, 100);
    mesh = new THREE.Mesh(geometry, material);
    settings.geometryName = "torus";
    placeOnXYPlane(mesh);
    scene.add(mesh);
  }

  const animation = createExampleAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
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
        if (exportAction === "Export G-code") void exportToGCode();
      }
    },
    cleanup() {
      animation.cleanup();
      controls.dispose();
      clearScene();
      gridHelper.dispose();
      renderer.dispose();
      THREE.Object3D.DEFAULT_UP.copy(previousDefaultUp);
      if (globalThis.THREE === THREE) delete globalThis.THREE;
    },
  };
}

export const example = { setup };

// Adapted from three.js r186 examples/webgl_loader_svg.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

// The upstream GUI maps these labels to examples/models/svg/<file>; Tiger and
// emoji, blueprint and the tests/testDefs files are left out for licensing; see meta.differences.
const svgFiles = {
  "Joins and caps": () =>
    import("../../../../assets/svg/lineJoinsAndCaps.svg?raw"),
  Hexagon: () => import("../../../../assets/svg/hexagon.svg?raw"),
  Energy: () => import("../../../../assets/svg/energy.svg?raw"),
  "Test 1": () => import("../../../../assets/svg/tests/1.svg?raw"),
  "Test 2": () => import("../../../../assets/svg/tests/2.svg?raw"),
  "Test 3": () => import("../../../../assets/svg/tests/3.svg?raw"),
  "Test 4": () => import("../../../../assets/svg/tests/4.svg?raw"),
  "Test 5": () => import("../../../../assets/svg/tests/5.svg?raw"),
  "Test 6": () => import("../../../../assets/svg/tests/6.svg?raw"),
  "Test 7": () => import("../../../../assets/svg/tests/7.svg?raw"),
  "Test 8": () => import("../../../../assets/svg/tests/8.svg?raw"),
  "Test 9": () => import("../../../../assets/svg/tests/9.svg?raw"),
  Units: () => import("../../../../assets/svg/tests/units.svg?raw"),
  Ordering: () => import("../../../../assets/svg/tests/ordering.svg?raw"),
  "Style CSS inside defs": () =>
    import("../../../../assets/svg/style-css-inside-defs.svg?raw"),
  "Styled Paths": () => import("../../../../assets/svg/styled-paths.svg?raw"),
  "Multiple CSS classes": () =>
    import("../../../../assets/svg/multiple-css-classes.svg?raw"),
  "Zero Radius": () => import("../../../../assets/svg/zero-radius.svg?raw"),
  "Styles in svg tag": () =>
    import("../../../../assets/svg/tests/styles.svg?raw"),
  "Round join": () =>
    import("../../../../assets/svg/tests/roundJoinPrecisionIssue.svg?raw"),
  "Ellipse Transformations": () =>
    import("../../../../assets/svg/tests/ellipseTransform.svg?raw"),
  singlePointTest: () =>
    import("../../../../assets/svg/singlePointTest.svg?raw"),
  singlePointTest2: () =>
    import("../../../../assets/svg/singlePointTest2.svg?raw"),
  singlePointTest3: () =>
    import("../../../../assets/svg/singlePointTest3.svg?raw"),
  emptyPath: () => import("../../../../assets/svg/emptyPath.svg?raw"),
  wideStroke: () => import("../../../../assets/svg/tests/wideStroke.svg?raw"),
  letter: () => import("../../../../assets/svg/tests/letter.svg?raw"),
};

const flag = (value) => value !== "off";

export function setup(canvas, params = {}) {
  let scene;
  let loadId = 0;

  //

  const camera = new THREE.PerspectiveCamera(
    50,
    canvas.width / canvas.height,
    1,
    1000,
  );
  camera.position.set(0, 0, 200);

  //

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;

  //

  const guiData = {
    currentURL: params.currentURL ?? "Joins and caps",
    drawFillShapes: flag(params.drawFillShapes ?? "on"),
    drawStrokes: flag(params.drawStrokes ?? "on"),
    fillShapesWireframe: params.fillShapesWireframe === "on",
    strokesWireframe: params.strokesWireframe === "on",
  };

  loadSVG(guiData.currentURL);

  function loadSVG(url) {
    //

    if (scene) disposeScene(scene);

    //

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb0b0b0);

    //

    const helper = new THREE.GridHelper(160, 10, 0x8d8d8d, 0xc1c1c1);
    helper.rotation.x = Math.PI / 2;
    scene.add(helper);

    //

    const loader = new SVGLoader();
    const target = scene;
    const id = ++loadId;

    (svgFiles[url] ?? svgFiles["Joins and caps"])().then(
      ({ default: text }) => {
        if (id !== loadId) return;
        const data = loader.parse(text);

        const group = new THREE.Group();
        group.scale.multiplyScalar(0.25);
        group.position.x = -70;
        group.position.y = 70;
        group.scale.y *= -1;

        let renderOrder = 0;

        for (const path of data.paths) {
          if (guiData.drawFillShapes) {
            const material = SVGLoader.createFillMaterial(path);

            if (material) {
              material.wireframe = guiData.fillShapesWireframe;

              const shapes = path.toShapes();

              for (const shape of shapes) {
                const geometry = new THREE.ShapeGeometry(shape);
                const mesh = new THREE.Mesh(geometry, material);
                mesh.renderOrder = renderOrder++;

                group.add(mesh);
              }
            }
          }

          if (guiData.drawStrokes) {
            const material = SVGLoader.createStrokeMaterial(path);

            if (material) {
              material.wireframe = guiData.strokesWireframe;

              for (const subPath of path.subPaths) {
                const geometry = SVGLoader.pointsToStroke(
                  subPath.getPoints(),
                  path.userData.style,
                );

                if (geometry) {
                  const mesh = new THREE.Mesh(geometry, material);
                  mesh.renderOrder = renderOrder++;

                  group.add(mesh);
                }
              }
            }
          }
        }

        target.add(group);
      },
    );
  }

  function disposeScene(scene) {
    scene.traverse((object) => {
      if (object.isMesh || object.isLine) {
        object.geometry.dispose();
        if (object.material.map) object.material.map.dispose();
        object.material.dispose();
      }
    });
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
      if (next.currentURL !== undefined) guiData.currentURL = next.currentURL;
      if (next.drawStrokes !== undefined)
        guiData.drawStrokes = flag(next.drawStrokes);
      if (next.drawFillShapes !== undefined)
        guiData.drawFillShapes = flag(next.drawFillShapes);
      if (next.strokesWireframe !== undefined)
        guiData.strokesWireframe = next.strokesWireframe === "on";
      if (next.fillShapesWireframe !== undefined)
        guiData.fillShapesWireframe = next.fillShapesWireframe === "on";
      loadSVG(guiData.currentURL);
    },
    cleanup() {
      animation.cleanup();
      loadId++;
      disposeScene(scene);
      controls.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };

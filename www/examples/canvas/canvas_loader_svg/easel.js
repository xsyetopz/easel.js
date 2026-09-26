import {
  BasicMaterial,
  Color,
  Geometry,
  GridHelper,
  Group,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  ShapeGeometry,
  Side,
  SVGLoader,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_loader_svg",
  upstream: "webgl_loader_svg",
  name: "loader / svg",
  category: "canvas",
  animated: true,
  description:
    "Parse SVG files into ShapeGeometry fills and stroke meshes over a grid, with toggles for strokes, fills and wireframes.",
  differences: [
    "The default file is Joins and caps instead of Tiger, and the Tiger, emoji, blueprint, Defs, Defs2, Defs3, Defs4 and Defs5 files are left out: tiger.svg is the Ghostscript tiger (AGPL-3.0), emoji.svg is a Noto Emoji glyph, blueprint.svg is a third-party Illustrator file with no stated license, and tests/testDefs/* are CC-BY-SA 2.5.",
    "EASEL's SVGLoader has no createFillMaterial, createStrokeMaterial or pointsToStroke, so the port builds BasicMaterials from each path's style (fill defaults to black, stroke width to 1) and draws each stroke segment as a plain quad, without line joins, caps or miter limits.",
    "EASEL's SVGLoader ignores <style> sheets, CSS classes, <use>/<defs> references, gradients and non-px units, so Style CSS inside defs, Multiple CSS classes, Styles in svg tag and Units draw with default black fills, and gradient fills fall back to a flat color.",
    "EASEL's SVG path parser reads the implicit line-to pairs after an absolute M command as relative from the second pair on, so paths written as M x,y x,y x,y (the Joins and caps shapes, among others) draw distorted.",
    "EASEL's SVG path parser rejects arc commands whose flags are packed against the next number (for example A4.679 4.679 0 0012.711.092), so Test 9 shows only the grid.",
    "SVG opacity is rounded to EASEL's 9 discrete opacity levels, and draw order follows material.layer because EASEL has no per-mesh renderOrder.",
  ],
};
/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "currentURL",
    label: "SVG File",
    options: [
      "Joins and caps",
      "Hexagon",
      "Energy",
      "Test 1",
      "Test 2",
      "Test 3",
      "Test 4",
      "Test 5",
      "Test 6",
      "Test 7",
      "Test 8",
      "Test 9",
      "Units",
      "Ordering",
      "Style CSS inside defs",
      "Styled Paths",
      "Multiple CSS classes",
      "Zero Radius",
      "Styles in svg tag",
      "Round join",
      "Ellipse Transformations",
      "singlePointTest",
      "singlePointTest2",
      "singlePointTest3",
      "emptyPath",
      "wideStroke",
      "letter",
    ],
    default: "Joins and caps",
  },
  {
    type: "select",
    key: "drawStrokes",
    label: "Draw strokes",
    options: ["on", "off"],
    default: "on",
  },
  {
    type: "select",
    key: "drawFillShapes",
    label: "Draw fill shapes",
    options: ["on", "off"],
    default: "on",
  },
  {
    type: "select",
    key: "strokesWireframe",
    label: "Wireframe strokes",
    options: ["on", "off"],
    default: "off",
  },
  {
    type: "select",
    key: "fillShapesWireframe",
    label: "Wireframe fill shapes",
    options: ["on", "off"],
    default: "off",
  },
];

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

// three.js SVGLoader materials are transparent, double-sided and skip depth
// writes; EASEL takes opacity as a level from 0 (opaque) to 8 (invisible).
function createSVGMaterial(color, alpha, layer) {
  const opacity = Math.round((1 - Math.min(1, Math.max(0, alpha))) * 8);
  return new BasicMaterial({
    color,
    opacity,
    transparent: opacity > 0,
    side: Side.Double,
    depthWrite: false,
    layer,
  });
}

// Stand-in for SVGLoader.createFillMaterial: three.js defaults fill to #000.
function createFillMaterial(path, layer) {
  const style = path.userData.style;
  const fill = style.fill ?? "#000";
  if (fill === "none") return undefined;
  const color = style.fill === undefined ? new Color(0x000000) : path.color;
  return createSVGMaterial(
    color,
    (style.fillOpacity ?? 1) * (style.opacity || 1),
    layer,
  );
}

// Stand-in for SVGLoader.createStrokeMaterial.
function createStrokeMaterial(path, layer) {
  const style = path.userData.style;
  if (style.stroke === undefined || style.stroke === "none") return undefined;
  let color;
  try {
    color = new Color(style.stroke);
  } catch {
    color = new Color(0x000000);
  }
  return createSVGMaterial(
    color,
    (style.strokeOpacity ?? 1) * (style.opacity || 1),
    layer,
  );
}

// Cheap stand-in for SVGLoader.pointsToStroke: one quad per segment, with no
// joins, caps or miter limits.
function pointsToStroke(points, style) {
  const halfWidth = (style.strokeWidth ?? 1) / 2;
  const positions = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    const nx = (-dy / length) * halfWidth;
    const ny = (dx / length) * halfWidth;
    positions.push(
      a.x + nx,
      a.y + ny,
      0,
      a.x - nx,
      a.y - ny,
      0,
      b.x - nx,
      b.y - ny,
      0,
      a.x + nx,
      a.y + ny,
      0,
      b.x - nx,
      b.y - ny,
      0,
      b.x + nx,
      b.y + ny,
      0,
    );
  }
  if (positions.length === 0) return undefined;
  const geometry = new Geometry();
  geometry.setPositions(new Float32Array(positions));
  geometry.computeBoundingSphere();
  return geometry;
}

export function setup(canvas, params = {}) {
  let scene;
  let loadId = 0;

  //

  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1000,
  });
  camera.position.set(0, 0, 200);

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  const orbit = new OrbitControls(camera, canvas);
  orbit.screenSpacePanning = true;

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

    scene = new Scene();
    scene.background = 0xb0b0b0;

    //

    const helper = new GridHelper(160, 10, 0x8d8d8d, 0xc1c1c1);
    helper.rotation.x = Math.PI / 2;
    scene.add(helper);

    //

    const loader = new SVGLoader();
    const target = scene;
    const id = ++loadId;

    (svgFiles[url] ?? svgFiles["Joins and caps"])().then(
      ({ default: text }) => {
        if (id !== loadId) return;
        let data;
        try {
          data = loader.parse(text);
        } catch (error) {
          // EASEL's path parser rejects packed arc flags such as "0 0012.7".
          console.warn("SVGLoader could not parse this file", error);
          return;
        }

        const group = new Group();
        group.scale.multiplyScalar(0.25);
        group.position.x = -70;
        group.position.y = 70;
        group.scale.y *= -1;

        // EASEL has no Mesh.renderOrder; material.layer orders the draws.
        let renderOrder = 1;

        for (const path of data.paths) {
          if (guiData.drawFillShapes) {
            const material = createFillMaterial(path, renderOrder);

            if (material) {
              material.wireframe = guiData.fillShapesWireframe;

              const shapes = path.toShapes();

              for (const shape of shapes) {
                const geometry = new ShapeGeometry(shape);
                const mesh = new Mesh(geometry, material);
                renderOrder++;

                group.add(mesh);
              }
            }
          }

          if (guiData.drawStrokes) {
            const material = createStrokeMaterial(path, renderOrder);

            if (material) {
              material.wireframe = guiData.strokesWireframe;

              for (const subPath of path.subPaths) {
                const geometry = pointsToStroke(
                  subPath.getPoints(),
                  path.userData.style,
                );

                if (geometry) {
                  const mesh = new Mesh(geometry, material);
                  renderOrder++;

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
      orbit.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const data = new EASEL.SVGLoader().parse(svgText);
for (const path of data.paths) {
  const material = new EASEL.BasicMaterial({
    color: path.color,
    side: EASEL.Side.Double,
    depthWrite: false,
  });
  for (const shape of path.toShapes()) {
    group.add(new EASEL.Mesh(new EASEL.ShapeGeometry(shape), material));
  }
}

renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };

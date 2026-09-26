import {
  AmbientLight,
  Attribute,
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  Geometry,
  LambertMaterial,
  Mesh,
  OBJExporter,
  OrbitControls,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

const GEOMETRY_OPTIONS = [
  "Triangle",
  "Cube",
  "Cylinder",
  "Multiple objects",
  "Transformed objects",
  "Point Cloud",
];

export const meta = {
  id: "misc_exporter_obj",
  upstream: "misc_exporter_obj",
  name: "exporter / obj",
  category: "misc",
  animated: true,
  description:
    "Switch between a triangle, primitives, transformed objects, and a point cloud, then serialize the scene to Wavefront OBJ text with OBJExporter.",
  differences: [
    "The lil-gui buttons become two select controls: Geometry picks the scene, and switching Export to Export OBJ runs the exporter once.",
    "The export is not downloaded as object.obj; both sides log the exported text length with console.info instead, because the example contract gives the module only a canvas and no place for a status element.",
    "EASEL OBJExporter serializes only meshes, so the Point Cloud export has no vertex or p lines, where three.js writes the four colored points.",
    "EASEL OBJExporter writes its own header and comments (for example easel-material-color), so the text differs from the three.js exporter output.",
    "EASEL Points with vertexColors averages the colors of each run of three points, so the first three points of the Point Cloud draw in one brown color instead of red, red, and green.",
    "EASEL PointsMaterial.size is a fixed pixel radius, so the 10 unit points draw larger on screen and keep their pixel size at every zoom level.",
    "EASEL bakes Lambert lighting per vertex (Gouraud), so the lit faces show interpolated shading instead of per-pixel lighting.",
  ],
};

/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "geometry",
    label: "Geometry",
    options: GEOMETRY_OPTIONS,
    default: "Triangle",
  },
  {
    type: "select",
    key: "export",
    label: "Export",
    options: ["Idle", "Export OBJ"],
    default: "Idle",
  },
];

export function setup(canvas, params) {
  let geometryName = params.geometry ?? "Triangle";
  let exportAction = params.export ?? "Idle";

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
  camera.position.set(0, 0, 400);

  const scene = new Scene();

  const ambientLight = new AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff, 2.5);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);

  addGeometry(GEOMETRY_OPTIONS.indexOf(geometryName) + 1);

  const orbit = new OrbitControls(camera, canvas);
  orbit.enablePan = false;

  function exportToObj() {
    const exporter = new OBJExporter();
    const result = exporter.parse(scene);
    console.info(`EASEL object.obj: ${result.length} characters`);
  }

  function addGeometry(type) {
    for (let i = 0; i < scene.children.length; i++) {
      const child = scene.children[i];

      if (child.isMesh || child.isPoints) {
        child.geometry.dispose();
        scene.remove(child);
        i--;
      }
    }

    if (type === 1) {
      const material = new LambertMaterial({ color: 0x00cc00 });
      const geometry = generateTriangleGeometry();

      scene.add(new Mesh(geometry, material));
    } else if (type === 2) {
      const material = new LambertMaterial({ color: 0x00cc00 });
      const geometry = new BoxGeometry(100, 100, 100);
      scene.add(new Mesh(geometry, material));
    } else if (type === 3) {
      const material = new LambertMaterial({ color: 0x00cc00 });
      const geometry = new CylinderGeometry(50, 50, 100, 30, 1);
      scene.add(new Mesh(geometry, material));
    } else if (type === 4 || type === 5) {
      const material = new LambertMaterial({ color: 0x00cc00 });
      const geometry = generateTriangleGeometry();

      const mesh = new Mesh(geometry, material);
      mesh.position.x = -200;
      scene.add(mesh);

      const geometry2 = new BoxGeometry(100, 100, 100);
      const mesh2 = new Mesh(geometry2, material);
      scene.add(mesh2);

      const geometry3 = new CylinderGeometry(50, 50, 100, 30, 1);
      const mesh3 = new Mesh(geometry3, material);
      mesh3.position.x = 200;
      scene.add(mesh3);

      if (type === 5) {
        mesh.rotation.y = Math.PI / 4.0;
        mesh2.rotation.y = Math.PI / 4.0;
        mesh3.rotation.y = Math.PI / 4.0;
      }
    } else if (type === 6) {
      const points = [0, 0, 0, 100, 0, 0, 100, 100, 0, 0, 100, 0];
      const colors = [0.5, 0, 0, 0.5, 0, 0, 0, 0.5, 0, 0, 0.5, 0];

      const geometry = new Geometry();
      geometry.setAttribute(
        "position",
        new Attribute(new Float32Array(points), 3),
      );
      geometry.setAttribute(
        "color",
        new Attribute(new Float32Array(colors), 3),
      );

      const material = new PointsMaterial({ size: 10, vertexColors: true });

      const pointCloud = new Points(geometry, material);
      pointCloud.name = "point cloud";
      scene.add(pointCloud);
    }
  }

  function generateTriangleGeometry() {
    const geometry = new Geometry();
    const vertices = [];

    vertices.push(-50, -50, 0);
    vertices.push(50, -50, 0);
    vertices.push(50, 50, 0);

    geometry.setAttribute(
      "position",
      new Attribute(new Float32Array(vertices), 3),
    );
    geometry.computeVertexNormals();

    return geometry;
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
      if (next.geometry !== undefined && next.geometry !== geometryName) {
        geometryName = next.geometry;
        addGeometry(GEOMETRY_OPTIONS.indexOf(geometryName) + 1);
      }
      if (next.export !== undefined && next.export !== exportAction) {
        exportAction = next.export;
        if (exportAction === "Export OBJ") exportToObj();
      }
    },
    cleanup() {
      animation.cleanup();
      orbit.dispose();
      addGeometry(0);
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.Geometry();
geometry.setAttribute("position", new EASEL.Attribute(new Float32Array(vertices), 3));
geometry.computeVertexNormals();
scene.add(new EASEL.Mesh(geometry, new EASEL.LambertMaterial({ color: 0x00cc00 })));

const exporter = new EASEL.OBJExporter();
const result = exporter.parse(scene);
console.info(\`object.obj: \${result.length} characters\`);`;

export const example = { meta, controls, setup, easelSource };

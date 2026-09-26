import {
  Attribute,
  BasicMaterial,
  Color,
  Geometry,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  Renderer,
  Scene,
  SphereGeometry,
  Timer,
  Vector2,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export const meta = {
  id: "canvas_interactive_raycasting_points",
  upstream: "webgl_interactive_raycasting_points",
  name: "interactive / raycasting / points",
  category: "canvas",
  animated: true,
  description:
    "Three 12,800-point clouds (non-indexed, indexed, and indexed with a draw group) circle past the camera while the pointer raycasts them and drops shrinking red spheres at each hit.",
  differences: [
    "EASEL point size is an integer pixel radius without size attenuation, so the 0.05-unit points (under one pixel wide in three.js at this size) become 1-pixel-radius discs, about 3 pixels wide, that do not scale with distance.",
    "EASEL Geometry has no addGroup, so the third cloud is indexed like the second and skips the draw-group call.",
    "Points and spheres are rasterized on the CPU without anti-aliasing.",
  ],
};
export const controls = [];

export function setup(canvas) {
  let intersection;
  let spheresIndex = 0;
  let toggle = 0;

  const pointer = new Vector2();
  const spheres = [];

  const threshold = 0.1;
  const pointSize = 1;
  const width = 80;
  const length = 160;
  const rotateY = new Matrix4().makeRotationY(0.005);

  function generatePointCloudGeometry(color, width, length) {
    const geometry = new Geometry();
    const numPoints = width * length;

    const positions = new Float32Array(numPoints * 3);
    const colors = new Float32Array(numPoints * 3);

    let k = 0;

    for (let i = 0; i < width; i++) {
      for (let j = 0; j < length; j++) {
        const u = i / width;
        const v = j / length;
        const x = u - 0.5;
        const y = (Math.cos(u * Math.PI * 4) + Math.sin(v * Math.PI * 8)) / 20;
        const z = v - 0.5;

        positions[3 * k] = x;
        positions[3 * k + 1] = y;
        positions[3 * k + 2] = z;

        const intensity = (y + 0.1) * 5;
        colors[3 * k] = color.r * intensity;
        colors[3 * k + 1] = color.g * intensity;
        colors[3 * k + 2] = color.b * intensity;

        k++;
      }
    }

    geometry.setAttribute("position", new Attribute(positions, 3));
    geometry.setAttribute("color", new Attribute(colors, 3));
    geometry.computeBoundingBox();

    return geometry;
  }

  function generatePointcloud(color, width, length) {
    const geometry = generatePointCloudGeometry(color, width, length);
    const material = new PointsMaterial({
      size: pointSize,
      vertexColors: true,
    });

    return new Points(geometry, material);
  }

  function generateIndexedPointcloud(color, width, length) {
    const geometry = generatePointCloudGeometry(color, width, length);
    const numPoints = width * length;
    const indices = new Uint16Array(numPoints);

    let k = 0;

    for (let i = 0; i < width; i++) {
      for (let j = 0; j < length; j++) {
        indices[k] = k;
        k++;
      }
    }

    geometry.index = indices;

    const material = new PointsMaterial({
      size: pointSize,
      vertexColors: true,
    });

    return new Points(geometry, material);
  }

  function generateIndexedWithOffsetPointcloud(color, width, length) {
    const geometry = generatePointCloudGeometry(color, width, length);
    const numPoints = width * length;
    const indices = new Uint16Array(numPoints);

    let k = 0;

    for (let i = 0; i < width; i++) {
      for (let j = 0; j < length; j++) {
        indices[k] = k;
        k++;
      }
    }

    geometry.index = indices;
    // EASEL Geometry has no addGroup; the whole index range is drawn.

    const material = new PointsMaterial({
      size: pointSize,
      vertexColors: true,
    });

    return new Points(geometry, material);
  }

  const scene = new Scene();

  const timer = new Timer();
  timer.connect(canvas.ownerDocument);

  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 10000,
  });
  camera.position.set(10, 10, 10);
  camera.updateMatrixWorld();
  camera.lookAt(scene.position);
  camera.updateMatrix();

  //

  const pcBuffer = generatePointcloud(new Color(1, 0, 0), width, length);
  pcBuffer.scale.set(5, 10, 10);
  pcBuffer.position.set(-5, 0, 0);
  scene.add(pcBuffer);

  const pcIndexed = generateIndexedPointcloud(
    new Color(0, 1, 0),
    width,
    length,
  );
  pcIndexed.scale.set(5, 10, 10);
  pcIndexed.position.set(0, 0, 0);
  scene.add(pcIndexed);

  const pcIndexedOffset = generateIndexedWithOffsetPointcloud(
    new Color(0, 1, 1),
    width,
    length,
  );
  pcIndexedOffset.scale.set(5, 10, 10);
  pcIndexedOffset.position.set(5, 0, 0);
  scene.add(pcIndexedOffset);

  const pointclouds = [pcBuffer, pcIndexed, pcIndexedOffset];

  //

  const sphereGeometry = new SphereGeometry(0.1, 32, 32);
  const sphereMaterial = new BasicMaterial({
    color: 0xff0000,
    vertexColors: false,
  });

  for (let i = 0; i < 40; i++) {
    const sphere = new Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);
    spheres.push(sphere);
  }

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  const raycaster = new Raycaster();
  raycaster.pointsThreshold = threshold;

  //

  canvas.addEventListener("pointermove", onPointerMove);

  function onPointerMove(event) {
    pointerToNdc(event, canvas, pointer);
  }

  function render() {
    camera.applyMatrix4(rotateY);
    camera.updateMatrixWorld();

    raycaster.setFromCamera(pointer, camera);

    const intersections = raycaster.intersectObjects(pointclouds, false);
    intersection = intersections.length > 0 ? intersections[0] : undefined;

    if (toggle > 0.02 && intersection !== undefined) {
      spheres[spheresIndex].position.copy(intersection.point);
      spheres[spheresIndex].scale.set(1, 1, 1);
      spheresIndex = (spheresIndex + 1) % spheres.length;

      toggle = 0;
    }

    for (let i = 0; i < spheres.length; i++) {
      const sphere = spheres[i];
      sphere.scale.multiplyScalar(0.98);
      sphere.scale.clampScalar(0.01, 1);
    }

    toggle += timer.delta;

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(() => {
    timer.update();

    render();
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    cleanup() {
      animation.cleanup();
      canvas.removeEventListener("pointermove", onPointerMove);
      timer.dispose();
      for (const pointcloud of pointclouds) {
        pointcloud.geometry.dispose();
        pointcloud.material.dispose();
      }
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.Geometry();
geometry.setAttribute("position", new EASEL.Attribute(positions, 3));
geometry.setAttribute("color", new EASEL.Attribute(colors, 3));
const cloud = new EASEL.Points(
  geometry,
  new EASEL.PointsMaterial({ size: 1, vertexColors: true }),
);

const raycaster = new EASEL.Raycaster();
raycaster.pointsThreshold = 0.1;

camera.applyMatrix4(rotateY);
camera.updateMatrixWorld();
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObjects([cloud], false)[0];
if (hit !== undefined) sphere.position.copy(hit.point);

renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };

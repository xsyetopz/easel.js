import {
  AmbientLight,
  Attribute,
  DirectionalLight,
  Geometry,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_buffergeometry_attributes_integer",
  name: "Integer Vertex Attributes",
  category: "canvas",
  description:
    "Normalized Uint8 vertex colors are consumed by the CPU attribute path instead of a WebGL integer vertex buffer.",
};

export const controls = [];

function makeGeometry() {
  const geometry = new Geometry();
  geometry.setPositions([
    -1.8, -1.2, 0, 1.8, -1.2, 0, 1.8, 1.2, 0, -1.8, 1.2, 0, 0, 0, 1.8,
  ]);
  geometry.index = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4];
  geometry.computeVertexNormals();
  geometry.setAttribute(
    "color",
    new Attribute(
      new Uint8Array([
        235, 88, 88, 88, 202, 235, 239, 193, 84, 111, 111, 239, 236, 218, 76,
      ]),
      3,
      true,
    ),
  );
  geometry.computeBoundingSphere();
  return geometry;
}

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x141c2a;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.3, 6.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.4));
  const light = new DirectionalLight(0xffffff, 0.85);
  light.position.set(3, 4, 5);
  scene.add(light);
  const geometry = makeGeometry();
  const mesh = new Mesh(geometry, new LambertMaterial({ color: 0xffffff }));
  scene.add(mesh);
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    mesh.rotation.y += clock.update().delta * 0.45;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const colors = new EASEL.Attribute(new Uint8Array(rgb), 3, true);
geometry.setAttribute("color", colors);`;

export const threeSource = `import * as THREE from "three";

geometry.setAttribute("color", new THREE.Uint8BufferAttribute(rgb, 3, true));
material.vertexColors = true;`;

export const example = { meta, controls, setup, easelSource, threeSource };

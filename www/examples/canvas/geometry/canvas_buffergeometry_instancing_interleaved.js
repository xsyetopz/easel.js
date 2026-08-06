import {
  AmbientLight,
  Attribute,
  BoxGeometry,
  DirectionalLight,
  Geometry,
  InstancedMesh,
  InterleavedAttribute,
  InterleavedBuffer,
  LambertMaterial,
  Matrix4,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_buffergeometry_instancing_interleaved",
  name: "Interleaved Instance Data",
  category: "canvas",
  description:
    "InterleavedBuffer and InterleavedAttribute organize CPU instance positions; supported instance matrices consume the decoded values.",
};

export const controls = [];

function makePackedInstances(count) {
  const packed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    packed[i * 4] = (i % 9) - 4;
    packed[i * 4 + 1] = Math.sin(i * 0.9) * 0.45;
    packed[i * 4 + 2] = Math.floor(i / 9) - 2;
    packed[i * 4 + 3] = 0.4 + (i % 4) * 0.12;
  }
  const buffer = new InterleavedBuffer(packed, 4);
  return {
    buffer,
    position: new InterleavedAttribute(buffer, 3, 0),
    scale: new InterleavedAttribute(buffer, 1, 3),
  };
}

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x101725;
  const camera = new PerspectiveCamera({
    fov: 43,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 3.4, 11);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 6, 6);
  scene.add(light);
  const instances = makePackedInstances(45);
  const base = new BoxGeometry(0.52, 0.52, 0.52);
  base.computeBoundingSphere();
  const mesh = new InstancedMesh(
    base,
    new LambertMaterial({ color: 0x8dc5ed }),
    instances.buffer.count,
  );
  const matrix = new Matrix4();
  for (let i = 0; i < mesh.count; i++) {
    matrix.makeTranslation(
      instances.position.getX(i),
      instances.position.getY(i),
      instances.position.getZ(i),
    );
    const scale = instances.scale.getX(i);
    matrix.elements[0] = scale;
    matrix.elements[5] = scale;
    matrix.elements[10] = scale;
    mesh.setMatrixAt(i, matrix);
  }
  scene.add(mesh);

  const sample = new Geometry();
  sample.setPositions(new Float32Array([0, 0, 0, 0.1, 0, 0, 0, 0.1, 0]));
  sample.setAttribute(
    "weight",
    new Attribute(new Float32Array([0, 0.5, 1]), 1),
  );
  sample.computeBoundingSphere();
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    const delta = clock.update().delta;
    mesh.rotation.y += delta * 0.25;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      mesh.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const packed = new EASEL.InterleavedBuffer(values, 4);
const position = new EASEL.InterleavedAttribute(packed, 3, 0);
const scale = new EASEL.InterleavedAttribute(packed, 1, 3);
for (let i = 0; i < position.count; i++) {
  mesh.setMatrixAt(i, matrixFrom(position, scale.getX(i)));
}`;

export const threeSource = `import * as THREE from "three";

const geometry = new THREE.InstancedBufferGeometry();
const vertexBuffer = new THREE.InterleavedBuffer(vertices, 8);
geometry.setAttribute(
  "position",
  new THREE.InterleavedBufferAttribute(vertexBuffer, 3, 0),
);
geometry.setAttribute("uv", new THREE.InterleavedBufferAttribute(vertexBuffer, 2, 4));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
const material = new THREE.MeshBasicMaterial({
  map: new THREE.TextureLoader().load("textures/crate.gif"),
});
const mesh = new THREE.InstancedMesh(geometry, material, count);
mesh.setMatrixAt(index, matrix);`;

export const example = { meta, controls, setup, easelSource, threeSource };

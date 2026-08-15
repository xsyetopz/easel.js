import { createOrthoCamera } from "./benchmark-helpers.mjs";

function addHierarchyBranch(state) {
  const { EASEL, geometry, materials, parent, depth, index, x, z, stats } =
    state;
  const group = new EASEL.Group();
  group.position.set((index - 1.5) * 0.55, 0.35, 0);
  parent.add(group);
  if (depth === 0) {
    const mesh = new EASEL.Mesh(geometry, materials[index % materials.length]);
    mesh.position.set(x, Math.sin((x + z) * 0.6) * 0.8, z);
    group.add(mesh);
    stats.leaves++;
    return;
  }
  for (let i = 0; i < 4; i++) {
    addHierarchyBranch({
      ...state,
      parent: group,
      depth: depth - 1,
      index: i,
      x: x + (i - 1.5) * (depth + 1) * 0.32,
      z: z + (index - 1.5) * 0.42,
    });
  }
}

function createHierarchyState(EASEL) {
  const width = 640;
  const height = 360;
  const scene = new EASEL.Scene();
  const renderer = new EASEL.Renderer({ width, height, sortObjects: true });
  const camera = createOrthoCamera(EASEL, width, height, 12);
  camera.position.set(0, 10, 18);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));
  scene.add(new EASEL.AmbientLight(0xffffff, 0.32));
  const light = new EASEL.DirectionalLight(0xffffff, 0.8);
  light.position.set(5, 12, 8);
  scene.add(light);
  const geometry = new EASEL.BoxGeometry(0.25, 0.25, 0.25);
  geometry.computeBoundingSphere();
  const materials = [0x80a0ff, 0xff8f70, 0x76d68e, 0xe4c15f].map(
    (color) =>
      new EASEL.LambertMaterial({ color, shading: EASEL.Shading.Flat }),
  );
  const root = new EASEL.Group();
  scene.add(root);
  const state = {
    EASEL,
    geometry,
    materials,
    parent: root,
    stats: { leaves: 0 },
  };
  for (let i = 0; i < 4; i++) {
    addHierarchyBranch({
      ...state,
      depth: 3,
      index: i,
      x: (i - 1.5) * 1.8,
      z: 0,
    });
  }
  return {
    width,
    height,
    scene,
    renderer,
    camera,
    root,
    leaves: state.stats.leaves,
  };
}

export function createHierarchyWorkload(EASEL) {
  return {
    name: "hierarchy-transform-forest",
    description:
      "4-way deep transform tree with 256 mesh leaves; matrix propagation and traversal pressure.",
    create() {
      const { width, height, scene, renderer, camera, root, leaves } =
        createHierarchyState(EASEL);
      return {
        camera,
        renderer,
        scene,
        metadata: { width, height, leaves, branchFactor: 4, depth: 5 },
        step(frame) {
          root.rotation.y = Math.sin(frame * 0.004) * 0.5;
        },
      };
    },
  };
}

function createInstancedState(EASEL) {
  const width = 640;
  const height = 360;
  const count = 900;
  const scene = new EASEL.Scene();
  const renderer = new EASEL.Renderer({ width, height, sortObjects: true });
  const camera = createOrthoCamera(EASEL, width, height, 24);
  camera.position.set(0, 18, 34);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));
  scene.add(new EASEL.AmbientLight(0xffffff, 0.24));
  const key = new EASEL.DirectionalLight(0xffffff, 0.9);
  key.position.set(7, 13, 9);
  scene.add(key);
  const geometry = new EASEL.BoxGeometry(0.52, 0.52, 0.52);
  geometry.computeBoundingSphere();
  const material = new EASEL.LambertMaterial({
    color: 0x76a9ff,
    shading: EASEL.Shading.Gouraud,
  });
  const mesh = new EASEL.InstancedMesh(geometry, material, count);
  const matrix = new EASEL.Matrix4();
  const color = { r: 1, g: 1, b: 1 };
  const side = 30;
  for (let i = 0; i < count; i++) {
    const x = i % side;
    const z = (i / side) | 0;
    const px = (x - side / 2) * 0.72;
    const pz = (z - side / 2) * 0.72;
    const py = Math.sin((x * 5 + z * 11) * 0.17) * 0.7;
    matrix.makeTranslation(px, py, pz);
    mesh.setMatrixAt(i, matrix);
    color.r = 0.45 + (x % 5) * 0.08;
    color.g = 0.58 + (z % 7) * 0.04;
    color.b = 0.75;
    mesh.setColorAt(i, color);
  }
  scene.add(mesh);
  return { width, height, scene, renderer, camera, mesh, count };
}

export function createInstancedMeshWorkload(EASEL) {
  return {
    name: "instanced-mesh-field",
    description:
      "900 instanced boxes; instance matrix reads, per-instance culling, lighting, draw-call assembly.",
    create() {
      const { width, height, scene, renderer, camera, mesh, count } =
        createInstancedState(EASEL);
      return {
        camera,
        renderer,
        scene,
        metadata: {
          width,
          height,
          instances: count,
          estimatedTriangles: count * 12,
        },
        step(frame) {
          mesh.rotation.y = frame * 0.004;
          mesh.rotation.x = Math.sin(frame * 0.003) * 0.08;
        },
      };
    },
  };
}

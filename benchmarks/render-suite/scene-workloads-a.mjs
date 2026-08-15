import {
  createCheckerTexture,
  createOrthoCamera,
  createSpriteTexture,
} from "./benchmark-helpers.mjs";

function createMeshGridState(EASEL) {
  const width = 640;
  const height = 360;
  const scene = new EASEL.Scene();
  const renderer = new EASEL.Renderer({ width, height, sortObjects: true });
  const camera = createOrthoCamera(EASEL, width, height, 18);
  camera.position.set(0, 14, 26);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));
  scene.add(new EASEL.AmbientLight(0xffffff, 0.28));
  const key = new EASEL.DirectionalLight(0xffffff, 0.9);
  key.position.set(8, 12, 10);
  scene.add(key);
  const root = new EASEL.Group();
  scene.add(root);
  const geometry = new EASEL.BoxGeometry(0.72, 0.72, 0.72);
  geometry.computeBoundingSphere();
  const materials = [
    0x6c8cff, 0xe0694f, 0x4fc078, 0xd1a33a, 0xa66bd6, 0x4db9d8,
  ].map(
    (color) =>
      new EASEL.LambertMaterial({ color, shading: EASEL.Shading.Gouraud }),
  );
  const side = 20;
  for (let z = 0; z < side; z++) {
    for (let x = 0; x < side; x++) {
      const mesh = new EASEL.Mesh(
        geometry,
        materials[(x + z) % materials.length],
      );
      mesh.position.set(
        (x - side / 2) * 0.95,
        Math.sin((x * 13 + z * 7) * 0.17) * 0.65,
        (z - side / 2) * 0.95,
      );
      mesh.rotation.set(z * 0.03, x * 0.05, 0);
      root.add(mesh);
    }
  }
  return { width, height, scene, renderer, camera, root, side };
}

export function createMeshGridWorkload(EASEL) {
  return {
    name: "mesh-grid-gouraud",
    description:
      "400 shared-geometry lit meshes; traversal, projection, sorting, Gouraud shading, raster fill.",
    create() {
      const { width, height, scene, renderer, camera, root, side } =
        createMeshGridState(EASEL);
      return {
        camera,
        renderer,
        scene,
        metadata: {
          width,
          height,
          meshes: side * side,
          estimatedTriangles: side * side * 12,
        },
        step(frame) {
          root.rotation.y = frame * 0.006;
          root.rotation.x = Math.sin(frame * 0.004) * 0.08;
        },
      };
    },
  };
}

function createTexturedFogState(EASEL) {
  const width = 640;
  const height = 360;
  const scene = new EASEL.Scene();
  const renderer = new EASEL.Renderer({ width, height, sortObjects: true });
  const camera = createOrthoCamera(EASEL, width, height, 16);
  camera.position.set(0, 9, 24);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));
  scene.background = 0x0b1020;
  scene.fog = new EASEL.Fog({
    color: 0x0b1020,
    near: 8,
    far: 34,
    density: 2.2,
  });
  scene.add(new EASEL.AmbientLight(0xffffff, 0.25));
  const light = new EASEL.DirectionalLight(0xffffff, 0.85);
  light.position.set(5, 10, 8);
  scene.add(light);
  const texture = createCheckerTexture(EASEL, 64);
  const material = new EASEL.LambertMaterial({
    color: 0xdde7ff,
    map: texture,
    shading: EASEL.Shading.Gouraud,
  });
  const geometry = new EASEL.SphereGeometry(0.7, 16, 12);
  geometry.computeBoundingSphere();
  const root = new EASEL.Group();
  scene.add(root);
  const cols = 8;
  const rows = 5;
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      const mesh = new EASEL.Mesh(geometry, material);
      mesh.position.set(
        (x - 3.5) * 1.75,
        Math.sin((x + z) * 0.9) * 0.45,
        (z - 2) * 1.9,
      );
      mesh.rotation.set(0.2 * z, 0.15 * x, 0);
      root.add(mesh);
    }
  }
  return { width, height, scene, renderer, camera, root, cols, rows };
}

export function createTexturedFogWorkload(EASEL) {
  return {
    name: "textured-fog-field",
    description:
      "40 textured spheres through fog; UV sampling, light baking, fog blend, painter sort.",
    create() {
      const { width, height, scene, renderer, camera, root, cols, rows } =
        createTexturedFogState(EASEL);
      return {
        camera,
        renderer,
        scene,
        metadata: {
          width,
          height,
          meshes: cols * rows,
          textured: true,
          fog: true,
        },
        step(frame) {
          root.rotation.y = frame * 0.004;
        },
      };
    },
  };
}

export function createTransparentOverdrawWorkload(EASEL) {
  return {
    name: "transparent-overdraw-stack",
    description:
      "72 overlapping translucent planes; sort, blend, depth-test/write policy, fill-rate pressure.",
    create() {
      const width = 640;
      const height = 360;
      const scene = new EASEL.Scene();
      const renderer = new EASEL.Renderer({ width, height, sortObjects: true });
      const camera = createOrthoCamera(EASEL, width, height, 9);
      camera.position.set(0, 0, 12);
      camera.lookAt(new EASEL.Vector3(0, 0, 0));
      const geometry = new EASEL.PlaneGeometry(6.2, 3.5);
      geometry.computeBoundingSphere();
      const root = new EASEL.Group();
      scene.add(root);
      const colors = [
        0x4f7cff, 0xff674f, 0x53c878, 0xffcc4f, 0xb06cff, 0x4fd7ff,
      ];
      for (let i = 0; i < 72; i++) {
        const material = new EASEL.BasicMaterial({
          color: colors[i % colors.length],
          depthWrite: false,
          layer: i % 8,
          opacity: 5,
          transparent: true,
        });
        const mesh = new EASEL.Mesh(geometry, material);
        mesh.position.set(
          Math.sin(i * 1.7) * 0.42,
          Math.cos(i * 1.3) * 0.28,
          -i * 0.018,
        );
        mesh.rotation.z = i * 0.087;
        root.add(mesh);
      }
      return {
        camera,
        renderer,
        scene,
        metadata: { width, height, planes: 72, transparent: true },
        step(frame) {
          root.rotation.z = Math.sin(frame * 0.003) * 0.12;
        },
      };
    },
  };
}

export function createSpriteBillboardWorkload(EASEL) {
  return {
    name: "sprite-billboard-field",
    description:
      "512 sprite-equivalent textured quads; texture alpha test, mesh traversal, painter sort, screen fill.",
    create() {
      const width = 640;
      const height = 360;
      const scene = new EASEL.Scene();
      const renderer = new EASEL.Renderer({ width, height, sortObjects: true });
      const camera = createOrthoCamera(EASEL, width, height, 14);
      camera.position.set(0, 0, 12);
      camera.lookAt(new EASEL.Vector3(0, 0, 0));
      const texture = createSpriteTexture(EASEL, 32);
      const material = new EASEL.BasicMaterial({
        color: 0xffffff,
        map: texture,
        side: EASEL.Side.Double,
      });
      const geometry = new EASEL.PlaneGeometry(0.42, 0.42);
      geometry.computeBoundingSphere();
      const root = new EASEL.Group();
      scene.add(root);
      const cols = 32;
      const rows = 16;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const mesh = new EASEL.Mesh(geometry, material);
          mesh.position.set(
            (x - (cols - 1) / 2) * 0.44,
            (y - (rows - 1) / 2) * 0.44,
            Math.sin((x * 17 + y * 31) * 0.13) * 1.25,
          );
          root.add(mesh);
        }
      }
      return {
        camera,
        renderer,
        scene,
        metadata: {
          width,
          height,
          quads: cols * rows,
          spriteEquivalent: true,
          textureAlpha: true,
        },
        step(frame) {
          root.rotation.z = Math.sin(frame * 0.006) * 0.05;
        },
      };
    },
  };
}

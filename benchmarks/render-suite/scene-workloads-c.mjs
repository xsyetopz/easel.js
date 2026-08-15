import { createOrthoCamera } from "./benchmark-helpers.mjs";

function addLightSweepLights(EASEL, scene) {
  scene.add(new EASEL.AmbientLight(0xffffff, 0.12));
  scene.add(new EASEL.HemisphereLight(0x98c8ff, 0x35220c, 0.32));
  const directional = new EASEL.DirectionalLight(0xffffff, 0.42);
  directional.position.set(8, 14, 7);
  scene.add(directional);
  for (let i = 0; i < 4; i++) {
    const point = new EASEL.PointLight(
      [0xff6a3d, 0x63d471, 0x4fa3ff, 0xe7d45c][i],
      0.72,
      16,
      2,
    );
    point.position.set((i - 1.5) * 5.8, 4 + (i & 1) * 2, 3 - i * 2.1);
    scene.add(point);
  }
  for (let i = 0; i < 2; i++) {
    const target = new EASEL.Group();
    target.position.set((i - 0.5) * 5, 0, 0);
    scene.add(target);
    const spot = new EASEL.SpotLight(0xffffff, 0.6, 28, Math.PI / 4, 0.25, 2);
    spot.position.set((i - 0.5) * 9, 10, 12);
    spot.target = target;
    scene.add(spot);
  }
}

function createLightSweepState(EASEL) {
  const width = 640;
  const height = 360;
  const scene = new EASEL.Scene();
  const renderer = new EASEL.Renderer({ width, height, sortObjects: true });
  const camera = createOrthoCamera(EASEL, width, height, 18);
  camera.position.set(0, 13, 27);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));
  addLightSweepLights(EASEL, scene);
  const root = new EASEL.Group();
  scene.add(root);
  const geometry = new EASEL.SphereGeometry(0.38, 10, 8);
  geometry.computeBoundingSphere();
  const materials = [0xbcd7ff, 0xffb36f, 0x8de087, 0xd89cff].map(
    (color) =>
      new EASEL.LambertMaterial({ color, shading: EASEL.Shading.Gouraud }),
  );
  const columns = 20;
  const rows = 8;
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < columns; x++) {
      const mesh = new EASEL.Mesh(
        geometry,
        materials[(x + z) % materials.length],
      );
      mesh.position.set(
        (x - columns / 2) * 0.72,
        Math.sin((x * 3 + z * 7) * 0.2) * 0.8,
        (z - rows / 2) * 0.9,
      );
      root.add(mesh);
    }
  }
  return { width, height, scene, renderer, camera, root, columns, rows };
}

export function createLightTypeSweepWorkload(EASEL) {
  return {
    name: "light-type-sweep",
    description:
      "160 lit meshes with ambient, directional, point, spot, and hemisphere lights; light accumulation pressure.",
    create() {
      const { width, height, scene, renderer, camera, root, columns, rows } =
        createLightSweepState(EASEL);
      return {
        camera,
        renderer,
        scene,
        metadata: { width, height, meshes: columns * rows, lights: 8 },
        step(frame) {
          root.rotation.y = Math.sin(frame * 0.005) * 0.18;
        },
      };
    },
  };
}

export function createLayeredSortWorkload(EASEL) {
  return {
    name: "layered-sort-mix",
    description:
      "640 mixed opaque/translucent planes across layers; draw priority and painter sorting pressure.",
    create() {
      const width = 640;
      const height = 360;
      const scene = new EASEL.Scene();
      const renderer = new EASEL.Renderer({ width, height, sortObjects: true });
      const camera = createOrthoCamera(EASEL, width, height, 18);
      camera.position.set(0, 0, 24);
      camera.lookAt(new EASEL.Vector3(0, 0, 0));
      const root = new EASEL.Group();
      scene.add(root);
      const geometry = new EASEL.PlaneGeometry(0.62, 0.62);
      geometry.computeBoundingSphere();
      const materials = [];
      for (let i = 0; i < 16; i++) {
        materials.push(
          new EASEL.BasicMaterial({
            color: [0x4d7cff, 0xf06f5f, 0x5ccf86, 0xd7b957][i & 3],
            layer: i & 7,
            opacity: (i & 1) === 0 ? 0 : 4,
            transparent: (i & 1) === 1,
            depthTest: (i & 2) === 0,
            depthWrite: (i & 1) === 0,
            side: EASEL.Side.Double,
          }),
        );
      }
      const count = 640;
      for (let i = 0; i < count; i++) {
        const mesh = new EASEL.Mesh(geometry, materials[i & 15]);
        const col = i % 32;
        const row = (i / 32) | 0;
        mesh.position.set(
          (col - 15.5) * 0.42,
          (row - 10) * 0.34,
          ((i * 17) % 37) * 0.08,
        );
        mesh.rotation.z = ((i * 13) % 29) * 0.02;
        root.add(mesh);
      }
      return {
        camera,
        renderer,
        scene,
        metadata: { width, height, drawCalls: count, materialVariants: 16 },
        step(frame) {
          root.rotation.z = Math.sin(frame * 0.006) * 0.03;
        },
      };
    },
  };
}

export function createWireframeRasterWorkload(EASEL) {
  return {
    name: "wireframe-raster-grid",
    description:
      "360 wireframe boxes; triangle edge raster path, depth policy, and draw-call traversal.",
    create() {
      const width = 640;
      const height = 360;
      const scene = new EASEL.Scene();
      const renderer = new EASEL.Renderer({ width, height, sortObjects: true });
      const camera = createOrthoCamera(EASEL, width, height, 18);
      camera.position.set(0, 11, 24);
      camera.lookAt(new EASEL.Vector3(0, 0, 0));
      const root = new EASEL.Group();
      scene.add(root);
      const geometry = new EASEL.BoxGeometry(0.72, 0.72, 0.72);
      geometry.computeBoundingSphere();
      const material = new EASEL.BasicMaterial({
        color: 0xb9d7ff,
        side: EASEL.Side.Double,
      });
      material.wireframe = true;
      const columns = 24;
      const rows = 15;
      for (let z = 0; z < rows; z++) {
        for (let x = 0; x < columns; x++) {
          const mesh = new EASEL.Mesh(geometry, material);
          mesh.position.set((x - columns / 2) * 0.72, 0, (z - rows / 2) * 0.72);
          mesh.rotation.set(x * 0.03, z * 0.04, 0);
          root.add(mesh);
        }
      }
      return {
        camera,
        renderer,
        scene,
        metadata: { width, height, meshes: columns * rows, wireframe: true },
        step(frame) {
          root.rotation.y = frame * 0.005;
        },
      };
    },
  };
}

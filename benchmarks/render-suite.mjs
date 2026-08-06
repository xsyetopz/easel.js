#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

installImageDataPolyfill();

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const EASEL = await loadEasel(options.entry);
const workloads = createWorkloads(EASEL);

if (options.list) {
  for (const workload of workloads) {
    console.log(`${workload.name}\t${workload.description}`);
  }
  process.exit(0);
}

const selectedWorkloads =
  options.workload === "all"
    ? workloads
    : workloads.filter((workload) => workload.name === options.workload);

if (selectedWorkloads.length === 0) {
  throw new Error(`Unknown workload '${options.workload}'. Run with --list.`);
}

const run = {
  tool: "easel-benchmark-suite",
  version: 2,
  entry: options.entry,
  runtime: getRuntimeMetadata(),
  options: {
    warmupFrames: options.warmup,
    samples: options.samples,
    framesPerSample: options.frames,
    profileTraversal: options.profileTraversal,
    gcBetweenSamples: options.gcBetweenSamples,
  },
  workloads: [],
};

for (const workload of selectedWorkloads) {
  run.workloads.push(runWorkload(workload, options));
}

printReport(run);

if (options.jsonPath) {
  const jsonPath = resolve(repoRoot, options.jsonPath);
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(run, null, 2)}\n`);
  console.log(`\njson: ${jsonPath}`);
}

function parseArgs(args) {
  const parsed = {
    entry: defaultEntry(),
    warmup: 60,
    samples: 40,
    frames: 5,
    workload: "all",
    jsonPath: "",
    profileTraversal: false,
    gcBetweenSamples: false,
    list: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--list") {
      parsed.list = true;
      continue;
    }
    if (arg === "--profile-traversal") {
      parsed.profileTraversal = true;
      continue;
    }
    if (arg === "--gc") {
      parsed.gcBetweenSamples = true;
      continue;
    }
    const eq = arg.indexOf("=");
    const key = eq === -1 ? arg : arg.slice(0, eq);
    const value = eq === -1 ? "" : arg.slice(eq + 1);
    switch (key) {
      case "--entry":
        parsed.entry = value;
        break;
      case "--warmup":
        parsed.warmup = parsePositiveInt(value, "warmup");
        break;
      case "--samples":
        parsed.samples = parsePositiveInt(value, "samples");
        break;
      case "--frames":
        parsed.frames = parsePositiveInt(value, "frames");
        break;
      case "--workload":
        parsed.workload = value || "all";
        break;
      case "--json":
        parsed.jsonPath = value;
        break;
      default:
        throw new Error(`Unknown argument '${arg}'. Run with --help.`);
    }
  }

  return parsed;
}

function parsePositiveInt(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`--${name} must be a positive integer.`);
  }
  return number;
}

function defaultEntry() {
  return globalThis.Bun === undefined ? "dist" : "src";
}

async function loadEasel(entry) {
  let modulePath;
  if (entry === "src") {
    modulePath = resolve(repoRoot, "src/index.ts");
  } else if (entry === "dist") {
    modulePath = resolve(repoRoot, "dist/index.es.js");
    if (!existsSync(modulePath)) {
      throw new Error(
        "dist entry missing. Run `bun run build` first or use --entry=src under Bun.",
      );
    }
  } else {
    modulePath = resolve(repoRoot, entry);
  }
  return await import(pathToFileURL(modulePath).href);
}

function installImageDataPolyfill() {
  if (typeof globalThis.ImageData !== "undefined") return;
  globalThis.ImageData = class BenchmarkImageData {
    constructor(data, width, height) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

function createWorkloads(EASEL) {
  return [
    createMeshGridWorkload(EASEL),
    createTexturedFogWorkload(EASEL),
    createTransparentOverdrawWorkload(EASEL),
    createSpriteBillboardWorkload(EASEL),
    createPointCloudWorkload(EASEL),
    createHierarchyWorkload(EASEL),
    createInstancedMeshWorkload(EASEL),
    createLightTypeSweepWorkload(EASEL),
    createLayeredSortWorkload(EASEL),
    createWireframeRasterWorkload(EASEL),
    createCanvasUploadWorkload(EASEL),
    createFramebufferCaptureWorkload(EASEL),
    createAnimationBindingWorkload(EASEL),
    createRaycasterWorkload(EASEL),
    createCurvePathWorkload(EASEL),
    createSkeletonSkinningWorkload(EASEL),
    createGeometrySetupWorkload(EASEL),
    createHelperControlsWorkload(EASEL),
    createLoaderSetupWorkload(EASEL),
    createTexturePreprocessWorkload(EASEL),
  ];
}

function createMeshGridWorkload(EASEL) {
  return {
    name: "mesh-grid-gouraud",
    description:
      "400 shared-geometry lit meshes; traversal, projection, sorting, Gouraud shading, raster fill.",
    create() {
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

function createTexturedFogWorkload(EASEL) {
  return {
    name: "textured-fog-field",
    description:
      "40 textured spheres through fog; UV sampling, light baking, fog blend, painter sort.",
    create() {
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

function createTransparentOverdrawWorkload(EASEL) {
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

function createSpriteBillboardWorkload(EASEL) {
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

function createPointCloudWorkload(EASEL) {
  return {
    name: "point-cloud-100k",
    description:
      "100k deterministic points; point projection, clipping, depth path, packed attribute reads.",
    create() {
      const width = 640;
      const height = 360;
      const scene = new EASEL.Scene();
      const renderer = new EASEL.Renderer({
        width,
        height,
        sortObjects: false,
      });
      const camera = createOrthoCamera(EASEL, width, height, 8);
      camera.position.set(0, 0, 12);
      camera.lookAt(new EASEL.Vector3(0, 0, 0));
      const count = 100000;
      const random = createRandom(0x8eace1);
      const positions = new Float32Array(count * 3);
      const radius = 3.2;
      let written = 0;
      while (written < count) {
        const x = (random() * 2 - 1) * radius;
        const y = (random() * 2 - 1) * radius;
        const z = (random() * 2 - 1) * radius;
        if (x * x + y * y + z * z > radius * radius) continue;
        const i3 = written * 3;
        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;
        written++;
      }
      const geometry = new EASEL.Geometry().setPositions(positions);
      geometry.computeBoundingSphere();
      const points = new EASEL.Points(
        geometry,
        new EASEL.PointsMaterial({ color: 0x88aaff, size: 1 }),
      );
      scene.add(points);
      return {
        camera,
        renderer,
        scene,
        metadata: { width, height, points: count },
        step(frame) {
          points.rotation.y = frame * 0.003;
          points.rotation.x = Math.sin(frame * 0.002) * 0.2;
        },
      };
    },
  };
}

function createHierarchyWorkload(EASEL) {
  return {
    name: "hierarchy-transform-forest",
    description:
      "4-way deep transform tree with 256 mesh leaves; matrix propagation and traversal pressure.",
    create() {
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
      let leaves = 0;
      function addBranch(parent, depth, index, x, z) {
        const group = new EASEL.Group();
        group.position.set((index - 1.5) * 0.55, 0.35, 0);
        parent.add(group);
        if (depth === 0) {
          const mesh = new EASEL.Mesh(
            geometry,
            materials[index % materials.length],
          );
          mesh.position.set(x, Math.sin((x + z) * 0.6) * 0.8, z);
          group.add(mesh);
          leaves++;
          return;
        }
        for (let i = 0; i < 4; i++) {
          addBranch(
            group,
            depth - 1,
            i,
            x + (i - 1.5) * (depth + 1) * 0.32,
            z + (index - 1.5) * 0.42,
          );
        }
      }
      for (let i = 0; i < 4; i++) {
        addBranch(root, 3, i, (i - 1.5) * 1.8, 0);
      }
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

function createInstancedMeshWorkload(EASEL) {
  return {
    name: "instanced-mesh-field",
    description:
      "900 instanced boxes; instance matrix reads, per-instance culling, lighting, draw-call assembly.",
    create() {
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

function createLightTypeSweepWorkload(EASEL) {
  return {
    name: "light-type-sweep",
    description:
      "160 lit meshes with ambient, directional, point, spot, and hemisphere lights; light accumulation pressure.",
    create() {
      const width = 640;
      const height = 360;
      const scene = new EASEL.Scene();
      const renderer = new EASEL.Renderer({ width, height, sortObjects: true });
      const camera = createOrthoCamera(EASEL, width, height, 18);
      camera.position.set(0, 13, 27);
      camera.lookAt(new EASEL.Vector3(0, 0, 0));

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
        const spot = new EASEL.SpotLight(
          0xffffff,
          0.6,
          28,
          Math.PI / 4,
          0.25,
          2,
        );
        spot.position.set((i - 0.5) * 9, 10, 12);
        spot.target = target;
        scene.add(spot);
      }

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

function createLayeredSortWorkload(EASEL) {
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

function createWireframeRasterWorkload(EASEL) {
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

function createCanvasUploadWorkload(EASEL) {
  return {
    name: "canvas-upload-call",
    description:
      "240 boxes rendered through a deterministic Canvas2D upload stub; exercises upload timing path.",
    create() {
      const width = 480;
      const height = 270;
      const uploadSink = { value: 0 };
      const canvas = createBenchmarkCanvas(width, height, uploadSink);
      const scene = new EASEL.Scene();
      const renderer = new EASEL.Renderer({
        canvas,
        width,
        height,
        sortObjects: true,
      });
      const camera = createOrthoCamera(EASEL, width, height, 16);
      camera.position.set(0, 12, 22);
      camera.lookAt(new EASEL.Vector3(0, 0, 0));
      scene.add(new EASEL.AmbientLight(0xffffff, 0.25));
      const light = new EASEL.DirectionalLight(0xffffff, 0.85);
      light.position.set(4, 9, 6);
      scene.add(light);
      const root = new EASEL.Group();
      scene.add(root);
      const geometry = new EASEL.BoxGeometry(0.58, 0.58, 0.58);
      geometry.computeBoundingSphere();
      const material = new EASEL.LambertMaterial({
        color: 0x74c0fc,
        shading: EASEL.Shading.Flat,
      });
      const columns = 20;
      const rows = 12;
      for (let z = 0; z < rows; z++) {
        for (let x = 0; x < columns; x++) {
          const mesh = new EASEL.Mesh(geometry, material);
          mesh.position.set((x - columns / 2) * 0.62, 0, (z - rows / 2) * 0.62);
          root.add(mesh);
        }
      }
      return {
        camera,
        renderer,
        scene,
        metadata: { width, height, meshes: columns * rows, uploadStub: true },
        step(frame) {
          root.rotation.y = Math.sin(frame * 0.004) * 0.35;
        },
        run(frame, timings) {
          this.step(frame);
          this.renderer.render(this.scene, this.camera, timings);
          timings.uploadSink = uploadSink.value & 1;
        },
      };
    },
  };
}

function createFramebufferCaptureWorkload(EASEL) {
  return {
    name: "framebuffer-capture-readback",
    description:
      "128x128 readback from a 320x180 ImageData source; framebuffer texture capture allocation/copy path.",
    create() {
      const sourceWidth = 320;
      const sourceHeight = 180;
      const captureWidth = 128;
      const captureHeight = 128;
      const sourceData = new Uint8ClampedArray(sourceWidth * sourceHeight * 4);
      for (let i = 0; i < sourceData.length; i += 4) {
        const pixel = (i / 4) | 0;
        sourceData[i] = pixel & 255;
        sourceData[i + 1] = (pixel >> 3) & 255;
        sourceData[i + 2] = (pixel >> 7) & 255;
        sourceData[i + 3] = 255;
      }
      const source = new ImageData(sourceData, sourceWidth, sourceHeight);
      const texture = new EASEL.FramebufferTexture(captureWidth, captureHeight);
      let sink = 0;
      return {
        metadata: { sourceWidth, sourceHeight, captureWidth, captureHeight },
        run(frame, timings) {
          const x = frame % (sourceWidth - captureWidth);
          const y = (frame * 3) % (sourceHeight - captureHeight);
          const start = performance.now();
          texture.capture(source, x, y);
          timings.captureMs = performance.now() - start;
          const data = texture.data?.data;
          if (data) sink = (sink + data[0] + data[data.length - 4]) | 0;
          timings.captureSink = sink & 1;
        },
      };
    },
  };
}

function createBenchmarkCanvas(width, height, sink) {
  return {
    width,
    height,
    getContext(type) {
      if (type !== "2d") return null;
      return {
        imageSmoothingEnabled: false,
        putImageData(imageData) {
          const data = imageData.data;
          sink.value = (sink.value + data[0] + data[data.length - 4]) | 0;
        },
      };
    },
  };
}

function createAnimationBindingWorkload(EASEL) {
  return {
    name: "animation-binding-mix",
    description:
      "64-node hierarchy with 192 active tracks; track sampling, named binding lookup, mixer accumulation/apply.",
    create() {
      const root = new EASEL.Group();
      const nodes = [];
      for (let i = 0; i < 64; i++) {
        const node = new EASEL.Group();
        node.name = `anim-node-${i}`;
        node.position.set(i & 7, (i >> 3) & 7, 0);
        nodes.push(node);
        root.add(node);
      }
      const keyCount = 32;
      const fullTurn = Math.PI * 2;
      const times = new Float32Array(keyCount);
      for (let i = 0; i < keyCount; i++) times[i] = (i / (keyCount - 1)) * 4;
      const tracks = [];
      for (let i = 0; i < nodes.length; i++) {
        const positionValues = new Float32Array(keyCount * 3);
        const scaleValues = new Float32Array(keyCount * 3);
        const rotationValues = new Float32Array(keyCount);
        for (let k = 0; k < keyCount; k++) {
          const t = k / (keyCount - 1);
          const base = k * 3;
          positionValues[base] = (i & 7) + Math.sin(t * fullTurn + i) * 0.2;
          positionValues[base + 1] =
            ((i >> 3) & 7) + Math.cos(t * fullTurn + i) * 0.2;
          positionValues[base + 2] = Math.sin(t * Math.PI + i * 0.2) * 0.3;
          scaleValues[base] = 1 + Math.sin(t * fullTurn + i) * 0.04;
          scaleValues[base + 1] = 1 + Math.cos(t * fullTurn + i) * 0.04;
          scaleValues[base + 2] = 1;
          rotationValues[k] = Math.sin(t * 6.283 + i * 0.1) * 0.5;
        }
        tracks.push(
          new EASEL.VectorTrack(
            `${nodes[i].name}.position`,
            times,
            positionValues,
          ),
        );
        tracks.push(
          new EASEL.VectorTrack(`${nodes[i].name}.scale`, times, scaleValues),
        );
        tracks.push(
          new EASEL.NumberTrack(
            `${nodes[i].name}.rotation.x`,
            times,
            rotationValues,
          ),
        );
      }
      const clip = new EASEL.AnimationClip("binding-mix", 4, tracks);
      const animator = new EASEL.Animator(root);
      animator.clipAction(clip).play();
      let sink = 0;
      return {
        metadata: {
          nodes: nodes.length,
          tracks: tracks.length,
          keyframes: keyCount,
        },
        run(_frame, timings) {
          const start = performance.now();
          animator.update(1 / 60);
          timings.animationMs = performance.now() - start;
          sink += nodes[0].position.x + nodes[nodes.length - 1].scale.y;
          timings.animationSink = sink & 1;
        },
      };
    },
  };
}

function createRaycasterWorkload(EASEL) {
  return {
    name: "raycaster-scene-query",
    description:
      "Dense mesh and point picking query; recursive traversal, local transforms, hit allocation, and hit sorting.",
    create() {
      const scene = new EASEL.Scene();
      const root = new EASEL.Group();
      scene.add(root);
      const geometry = new EASEL.BoxGeometry(0.45, 0.45, 0.45);
      geometry.computeBoundingSphere();
      const material = new EASEL.BasicMaterial({ color: 0xffffff });
      const columns = 24;
      const rows = 16;
      for (let z = 0; z < rows; z++) {
        for (let x = 0; x < columns; x++) {
          const mesh = new EASEL.Mesh(geometry, material);
          mesh.position.set((x - columns / 2) * 0.62, (z - rows / 2) * 0.46, 0);
          mesh.rotation.set(z * 0.04, x * 0.03, 0);
          root.add(mesh);
        }
      }
      const pointGeometry = new EASEL.Geometry();
      const pointCount = 4000;
      const positions = new Float32Array(pointCount * 3);
      for (let i = 0; i < pointCount; i++) {
        positions[i * 3] = ((i % 100) - 50) * 0.12;
        positions[i * 3 + 1] = (((i / 100) | 0) - 20) * 0.12;
        positions[i * 3 + 2] = -1.5 + ((i * 17) % 31) * 0.03;
      }
      pointGeometry.setPositions(positions);
      pointGeometry.computeBoundingSphere();
      root.add(
        new EASEL.Points(pointGeometry, new EASEL.PointsMaterial({ size: 1 })),
      );
      scene.updateMatrixWorld(true);
      const raycaster = new EASEL.Raycaster();
      raycaster.threshold = 0.08;
      const origin = new EASEL.Vector3(0, 0, 12);
      const direction = new EASEL.Vector3(0, 0, -1);
      const intersects = [];
      let sink = 0;
      return {
        metadata: { meshes: columns * rows, points: pointCount },
        run(frame, timings) {
          origin.x = Math.sin(frame * 0.071) * 4;
          origin.y = Math.cos(frame * 0.053) * 3;
          direction
            .set(
              Math.sin(frame * 0.017) * 0.04,
              Math.cos(frame * 0.019) * 0.04,
              -1,
            )
            .normalize();
          intersects.length = 0;
          const start = performance.now();
          raycaster.set(origin, direction);
          raycaster.intersectObjects(scene.children, true, intersects);
          timings.raycastMs = performance.now() - start;
          sink += intersects.length;
          timings.raycastHits = intersects.length;
          timings.raycastSink = sink & 1;
        },
      };
    },
  };
}

function createCurvePathWorkload(EASEL) {
  return {
    name: "curve-path-sampling",
    description:
      "96 multi-segment paths; curve length aggregation, spaced sampling, tangent sampling, and point allocation.",
    create() {
      const paths = [];
      for (let i = 0; i < 96; i++) {
        const path = new EASEL.Path();
        path.moveTo(0, 0);
        for (let j = 0; j < 6; j++) {
          const t = i * 0.13 + j;
          path.bezierCurveTo(
            Math.sin(t) * 1.5,
            Math.cos(t) * 1.2,
            Math.sin(t + 0.7) * 2.2,
            Math.cos(t + 0.4) * 1.8,
            Math.sin(t + 1.1) * 2.8,
            Math.cos(t + 0.9) * 2.2,
          );
          path.quadraticCurveTo(
            Math.sin(t + 0.3) * 2.4,
            Math.cos(t + 0.8) * 2.4,
            Math.sin(t + 1.5) * 3,
            Math.cos(t + 1.2) * 3,
          );
        }
        paths.push(path);
      }
      let sink = 0;
      return {
        metadata: { paths: paths.length, segmentsPerPath: 12 },
        run(frame, timings) {
          const divisions = 16 + (frame & 7);
          const start = performance.now();
          for (const path of paths) {
            const points = path.getSpacedPoints(divisions);
            const tangent = path.getTangentAt((frame % 60) / 60);
            sink += (points.length + (tangent?.x ?? 0) * 1000) | 0;
          }
          timings.curveMs = performance.now() - start;
          timings.curveSink = sink & 1;
        },
      };
    },
  };
}

function createSkeletonSkinningWorkload(EASEL) {
  return {
    name: "skeleton-skinning-update",
    description:
      "64-bone hierarchy and 2048 CPU-skinned vertices; bone matrix packing and weighted vertex transforms.",
    create() {
      const bones = [];
      const root = new EASEL.Bone();
      root.name = "bone-0";
      bones.push(root);
      let parent = root;
      for (let i = 1; i < 64; i++) {
        const bone = new EASEL.Bone();
        bone.name = `bone-${i}`;
        bone.position.set(0, 0.08, 0);
        parent.add(bone);
        bones.push(bone);
        parent = bone;
      }
      root.updateMatrixWorld(true);
      const skeleton = new EASEL.Skeleton(bones);
      const vertexCount = 2048;
      const positions = new Float32Array(vertexCount * 3);
      const skinIndex = new Float32Array(vertexCount * 4);
      const skinWeight = new Float32Array(vertexCount * 4);
      for (let i = 0; i < vertexCount; i++) {
        positions[i * 3] = ((i % 64) - 32) * 0.02;
        positions[i * 3 + 1] = ((i / 64) | 0) * 0.03;
        positions[i * 3 + 2] = Math.sin(i * 0.01) * 0.1;
        const bone = i % (bones.length - 3);
        const base = i * 4;
        skinIndex[base] = bone;
        skinIndex[base + 1] = bone + 1;
        skinIndex[base + 2] = bone + 2;
        skinIndex[base + 3] = bone + 3;
        skinWeight[base] = 0.45;
        skinWeight[base + 1] = 0.3;
        skinWeight[base + 2] = 0.2;
        skinWeight[base + 3] = 0.05;
      }
      const geometry = new EASEL.Geometry();
      geometry.setPositions(positions);
      geometry.setAttribute("skinIndex", new EASEL.Attribute(skinIndex, 4));
      geometry.setAttribute("skinWeight", new EASEL.Attribute(skinWeight, 4));
      const mesh = new EASEL.SkinnedMesh(geometry, new EASEL.BasicMaterial());
      mesh.bind(skeleton);
      const target = { x: 0, y: 0, z: 0 };
      let sink = 0;
      return {
        metadata: { bones: bones.length, vertices: vertexCount, influences: 4 },
        run(frame, timings) {
          for (let i = 0; i < bones.length; i += 4) {
            bones[i].rotation.z = Math.sin(frame * 0.01 + i * 0.07) * 0.08;
          }
          const start = performance.now();
          root.updateMatrixWorld(true);
          skeleton.update();
          for (let i = 0; i < vertexCount; i++) {
            mesh.boneTransform(i, target);
            sink += (target.x * 1000) | 0;
          }
          timings.skinningMs = performance.now() - start;
          timings.skinningSink = sink & 1;
        },
      };
    },
  };
}

function createGeometrySetupWorkload(EASEL) {
  return {
    name: "geometry-construction-normals",
    description:
      "Grid geometry construction, normal computation, bounds, and representative primitive constructors.",
    create() {
      const grid = 48;
      const positions = new Float32Array(grid * grid * 3);
      const indices = new Uint32Array((grid - 1) * (grid - 1) * 6);
      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid; x++) {
          const i = y * grid + x;
          positions[i * 3] = (x - grid / 2) * 0.08;
          positions[i * 3 + 1] = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.12;
          positions[i * 3 + 2] = (y - grid / 2) * 0.08;
        }
      }
      let p = 0;
      for (let y = 0; y < grid - 1; y++) {
        for (let x = 0; x < grid - 1; x++) {
          const a = y * grid + x;
          const b = a + 1;
          const c = a + grid;
          const d = c + 1;
          indices[p++] = a;
          indices[p++] = c;
          indices[p++] = b;
          indices[p++] = b;
          indices[p++] = c;
          indices[p++] = d;
        }
      }
      const shape = new EASEL.Shape();
      shape
        .moveTo(-1, -1)
        .lineTo(1, -1)
        .lineTo(1, 1)
        .lineTo(-1, 1)
        .lineTo(-1, -1);
      let sink = 0;
      return {
        metadata: { grid, vertices: grid * grid, indices: indices.length },
        run(frame, timings) {
          const start = performance.now();
          const geometry = new EASEL.Geometry();
          geometry.setPositions(positions.slice());
          geometry.setIndex(indices);
          geometry.computeVertexNormals();
          geometry.computeBoundingSphere();
          const cylinder = new EASEL.CylinderGeometry(0.4, 0.25, 1, 24, 3);
          const torus = new EASEL.TorusGeometry(0.8, 0.18, 12, 32);
          const shapeGeometry = new EASEL.ShapeGeometry(
            shape,
            12 + (frame & 3),
          );
          timings.geometrySetupMs = performance.now() - start;
          sink +=
            (geometry.getAttribute("normal")?.count ?? 0) +
            (cylinder.index?.length ?? 0) +
            (torus.index?.length ?? 0) +
            (shapeGeometry.index?.length ?? 0);
          timings.geometrySink = sink & 1;
        },
      };
    },
  };
}

function createHelperControlsWorkload(EASEL) {
  return {
    name: "helper-controls-update",
    description:
      "BoxHelper update plus OrbitControls pointer/wheel/update path against deterministic event target.",
    create() {
      const tracked = {
        geometry: {
          boundingBox: {
            min: { x: -1, y: -1, z: -1 },
            max: { x: 1, y: 1, z: 1 },
          },
        },
      };
      const helper = new EASEL.BoxHelper(tracked, 0xffff00);
      const camera = createOrthoCamera(EASEL, 640, 360, 16);
      camera.position.set(0, 4, 12);
      camera.lookAt(new EASEL.Vector3(0, 0, 0));
      camera.updateMatrixWorld(true);
      const dom = createBenchmarkEventTarget(640, 360);
      const controls = new EASEL.OrbitControls(camera, dom);
      controls.enableDamping = true;
      controls.autoRotate = true;
      dom.dispatch("pointerdown", {
        pointerId: 1,
        clientX: 320,
        clientY: 180,
        button: 0,
      });
      let sink = 0;
      return {
        metadata: { helper: "BoxHelper", control: "OrbitControls" },
        run(frame, timings) {
          const box = tracked.geometry.boundingBox;
          box.min.x = -1 - Math.sin(frame * 0.03) * 0.2;
          box.max.y = 1 + Math.cos(frame * 0.02) * 0.2;
          const start = performance.now();
          helper.update();
          dom.dispatch("pointermove", {
            pointerId: 1,
            clientX: 320 + (frame % 97),
            clientY: 180 + ((frame * 3) % 83),
            button: 0,
          });
          if ((frame & 3) === 0) {
            dom.dispatch("wheel", {
              deltaY: (frame & 8) === 0 ? -1 : 1,
              preventDefault() {},
            });
          }
          controls.update();
          timings.helperControlsMs = performance.now() - start;
          sink +=
            camera.position.x +
            (helper.geometry?.getAttribute("position")?.count ?? 0);
          timings.helperControlsSink = sink & 1;
        },
      };
    },
  };
}

function createLoaderSetupWorkload(EASEL) {
  return {
    name: "loader-parse-batch",
    description:
      "Geometry, material, object, animation, and raw data texture parse paths with deterministic in-memory inputs.",
    create() {
      class RawTextureLoader extends EASEL.DataTextureLoader {
        parse(buffer) {
          const bytes = new Uint8Array(buffer);
          const width = 64;
          const height = 64;
          const data = new Uint8ClampedArray(width * height * 4);
          for (let i = 0; i < data.length; i++)
            data[i] = bytes[i & (bytes.length - 1)];
          return { data, width, height };
        }
      }
      const geometryLoader = new EASEL.GeometryLoader();
      const materialLoader = new EASEL.MaterialLoader();
      const objectLoader = new EASEL.ObjectLoader();
      const animationLoader = new EASEL.AnimationLoader();
      const textureLoader = new RawTextureLoader();
      const geometryJson = createGeometryJson(512);
      const objectJson = createObjectJson(4, 4);
      const animationJson = createAnimationJson(32, 24);
      const buffer = new Uint8Array(4096);
      for (let i = 0; i < buffer.length; i++) buffer[i] = (i * 37) & 255;
      let sink = 0;
      return {
        metadata: {
          geometryVertices: 512,
          objectDepth: 4,
          objectWidth: 4,
          animationTracks: 32,
        },
        run(frame, timings) {
          const start = performance.now();
          const geometry = geometryLoader.parse(geometryJson);
          const material = materialLoader.parse({
            type: (frame & 1) === 0 ? "BasicMaterial" : "LambertMaterial",
            color: 0xabcdef,
            opacity: frame & 7,
            transparent: (frame & 1) === 1,
          });
          const object = objectLoader.parse(objectJson);
          const clips = animationLoader.parse(animationJson);
          const parsed = textureLoader.parse(buffer.buffer);
          const texture = new EASEL.DataTexture(
            parsed.data,
            parsed.width,
            parsed.height,
          );
          timings.loaderSetupMs = performance.now() - start;
          sink +=
            (geometry.index?.length ?? 0) +
            Object.keys(material).length +
            object.children.length +
            clips.length +
            texture.width;
          timings.loaderSink = sink & 1;
        },
      };
    },
  };
}

function createTexturePreprocessWorkload(EASEL) {
  return {
    name: "texture-preprocess-cache",
    description:
      "Texture source clamp/cache and brightness-level construction through deterministic OffscreenCanvas stub.",
    create() {
      installBenchmarkOffscreenCanvas();
      const image = { width: 256, height: 192, phase: 0 };
      let sink = 0;
      return {
        metadata: {
          sourceWidth: image.width,
          sourceHeight: image.height,
          maxTextureSize: 128,
        },
        run(frame, timings) {
          image.phase = frame;
          const start = performance.now();
          const texture = new EASEL.Texture(image);
          texture.needsUpdate = true;
          const levels = texture.brightnessLevels;
          timings.texturePreprocessMs = performance.now() - start;
          if (levels)
            sink +=
              levels[levels.length - 1][(frame * 13) & (levels[0].length - 1)];
          timings.textureSink = sink & 1;
        },
      };
    },
  };
}

function createBenchmarkEventTarget(width, height) {
  const listeners = new Map();
  return {
    style: {},
    clientWidth: width,
    clientHeight: height,
    addEventListener(type, listener) {
      let entries = listeners.get(type);
      if (!entries) {
        entries = [];
        listeners.set(type, entries);
      }
      entries.push(listener);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type);
      if (!entries) return;
      const index = entries.indexOf(listener);
      if (index !== -1) entries.splice(index, 1);
    },
    setPointerCapture() {},
    releasePointerCapture() {},
    dispatch(type, event) {
      const entries = listeners.get(type) ?? [];
      for (const listener of entries) listener(event);
    },
  };
}

function createGeometryJson(vertexCount) {
  const positions = new Array(vertexCount * 3);
  const normals = new Array(vertexCount * 3);
  const uvs = new Array(vertexCount * 2);
  for (let i = 0; i < vertexCount; i++) {
    positions[i * 3] = Math.sin(i * 0.11);
    positions[i * 3 + 1] = Math.cos(i * 0.07);
    positions[i * 3 + 2] = (i % 17) * 0.03;
    normals[i * 3] = 0;
    normals[i * 3 + 1] = 1;
    normals[i * 3 + 2] = 0;
    uvs[i * 2] = (i % 32) / 31;
    uvs[i * 2 + 1] = ((i / 32) | 0) / 31;
  }
  const index = [];
  for (let i = 0; i < vertexCount - 2; i += 3) {
    index.push(i, i + 1, i + 2);
  }
  return {
    attributes: {
      position: { array: positions, itemSize: 3 },
      normal: { array: normals, itemSize: 3 },
      uv: { array: uvs, itemSize: 2 },
    },
    index: { array: index },
  };
}

function createObjectJson(depth, width) {
  function build(level, index) {
    const node = {
      type: "Group",
      name: `loader-node-${level}-${index}`,
      visible: true,
      position: [level * 0.1, index * 0.05, 0],
      scale: [1, 1, 1],
      children: [],
    };
    if (level < depth) {
      for (let i = 0; i < width; i++) node.children.push(build(level + 1, i));
    }
    return node;
  }
  return build(0, 0);
}

function createAnimationJson(trackCount, keyCount) {
  const times = [];
  for (let i = 0; i < keyCount; i++) times.push((i / (keyCount - 1)) * 2);
  const tracks = [];
  for (let i = 0; i < trackCount; i++) {
    const values = [];
    for (let k = 0; k < keyCount; k++) values.push(Math.sin(i * 0.3 + k * 0.2));
    tracks.push({
      type: "number",
      name: `loader-node-${i & 7}.position.x`,
      times,
      values,
    });
  }
  return [{ name: "loader-clip", duration: 2, tracks }];
}

function installBenchmarkOffscreenCanvas() {
  if (typeof globalThis.OffscreenCanvas !== "undefined") return;
  globalThis.OffscreenCanvas = class BenchmarkOffscreenCanvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.source = undefined;
    }
    getContext(type) {
      if (type !== "2d") return;
      return {
        imageSmoothingEnabled: false,
        drawImage: (source) => {
          this.source = source;
        },
        getImageData: (_x, _y, width, height) => {
          const data = new Uint8ClampedArray(width * height * 4);
          const phase = this.source?.phase ?? 0;
          for (let i = 0; i < data.length; i += 4) {
            const pixel = (i >> 2) + phase;
            data[i] = pixel & 255;
            data[i + 1] = (pixel >> 2) & 255;
            data[i + 2] = (pixel >> 4) & 255;
            data[i + 3] = 255;
          }
          return new ImageData(data, width, height);
        },
      };
    }
  };
}

function createOrthoCamera(EASEL, width, height, viewHeight) {
  const aspect = width / height;
  return new EASEL.OrthographicCamera({
    left: (-viewHeight * aspect) / 2,
    right: (viewHeight * aspect) / 2,
    top: viewHeight / 2,
    bottom: -viewHeight / 2,
    near: 0.1,
    far: 200,
  });
}

function createSpriteTexture(EASEL, size) {
  const data = new Uint8ClampedArray(size * size * 4);
  const center = (size - 1) * 0.5;
  const radius = size * 0.42;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const alpha = dist <= radius ? 255 : 0;
      data[i] = 210;
      data[i + 1] = 228;
      data[i + 2] = 255;
      data[i + 3] = alpha;
    }
  }
  return new EASEL.DataTexture(data, size, size);
}

function createCheckerTexture(EASEL, size) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const checker = ((x >> 3) + (y >> 3)) & 1;
      const value = checker === 0 ? 224 : 48;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return new EASEL.DataTexture(data, size, size);
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function runWorkload(workload, options) {
  const instance = workload.create();
  const totalFrames = options.warmup + options.samples * options.frames;
  let frame = 0;

  for (; frame < options.warmup; frame++) {
    runFrame(instance, frame, { profileTraversal: options.profileTraversal });
  }

  if (options.gcBetweenSamples) runGarbageCollector();

  const samples = [];
  const stageSamples = [];
  const memoryDeltaSamples = [];
  const memoryBefore = getMemoryUsage();

  for (let sample = 0; sample < options.samples; sample++) {
    if (options.gcBetweenSamples) runGarbageCollector();
    const stage = createStageAccumulator();
    const memorySampleBefore = getMemoryUsage();
    const start = performance.now();
    for (let i = 0; i < options.frames; i++, frame++) {
      const timings = { profileTraversal: options.profileTraversal };
      runFrame(instance, frame, timings);
      accumulateStage(stage, timings);
    }
    const elapsed = performance.now() - start;
    const memorySampleAfter = getMemoryUsage();
    samples.push(elapsed / options.frames);
    stageSamples.push(finalizeStageAccumulator(stage, options.frames));
    memoryDeltaSamples.push(
      diffMemoryUsage(memorySampleBefore, memorySampleAfter),
    );
  }

  const stageMs = summarizeStageSamples(stageSamples);
  return {
    name: workload.name,
    description: workload.description,
    metadata: instance.metadata,
    frames: totalFrames,
    warmupFrames: options.warmup,
    samples: options.samples,
    framesPerSample: options.frames,
    msPerFrame: summarize(samples),
    fps: summarize(samples.map((value) => 1000 / value)),
    stageMs,
    pipelineMs: stageMs,
    memoryBefore,
    memoryAfter: getMemoryUsage(),
    memoryDelta: summarizeMemoryDeltas(memoryDeltaSamples),
  };
}

function runFrame(instance, frame, timings) {
  if (typeof instance.run === "function") {
    instance.run(frame, timings);
    return;
  }
  if (typeof instance.step === "function") instance.step(frame);
  instance.renderer.render(instance.scene, instance.camera, timings);
}

function createStageAccumulator() {
  return {};
}

function accumulateStage(accumulator, timings) {
  for (const [key, value] of Object.entries(timings)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    accumulator[key] = (accumulator[key] ?? 0) + value;
  }
}

function finalizeStageAccumulator(accumulator, frames) {
  const result = {};
  for (const [key, value] of Object.entries(accumulator)) {
    result[key] = value / frames;
  }
  return result;
}

function summarize(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const count = sorted.length;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / count;
  let variance = 0;
  for (const value of sorted) {
    const delta = value - mean;
    variance += delta * delta;
  }
  variance /= count;
  return {
    min: sorted[0],
    median: percentile(sorted, 0.5),
    mean,
    p95: percentile(sorted, 0.95),
    max: sorted[count - 1],
    stddev: Math.sqrt(variance),
  };
}

function summarizeStageSamples(samples) {
  const keys = Object.keys(samples[0] ?? {});
  const result = {};
  for (const key of keys) {
    result[key] = summarize(samples.map((sample) => sample[key]));
  }
  return result;
}

function diffMemoryUsage(before, after) {
  if (!(before && after)) return;
  const result = {};
  for (const [key, value] of Object.entries(after)) {
    const previous = before[key];
    if (typeof value === "number" && typeof previous === "number") {
      result[key] = value - previous;
    }
  }
  return result;
}

function summarizeMemoryDeltas(samples) {
  const present = samples.filter(Boolean);
  const keys = Object.keys(present[0] ?? {});
  const result = {};
  for (const key of keys) {
    result[key] = summarize(present.map((sample) => sample[key]));
  }
  return result;
}

function runGarbageCollector() {
  if (typeof globalThis.gc === "function") globalThis.gc();
}

function percentile(sorted, percentileValue) {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function getMemoryUsage() {
  if (typeof process?.memoryUsage !== "function") return;
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  };
}

function getRuntimeMetadata() {
  return {
    bun: globalThis.Bun?.version,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    versions: process.versions,
    cpu: process.env.EASEL_CPU_NAME || "unknown",
  };
}

function printReport(run) {
  console.log("# EASEL benchmark suite");
  console.log(`entry: ${run.entry}`);
  console.log(
    `runtime: node ${run.runtime.node}${run.runtime.bun ? `, bun ${run.runtime.bun}` : ""}, ${run.runtime.platform}/${run.runtime.arch}`,
  );
  console.log(
    `warmup: ${run.options.warmupFrames} frames, samples: ${run.options.samples}, frames/sample: ${run.options.framesPerSample}`,
  );
  for (const result of run.workloads) {
    console.log(`\n## ${result.name}`);
    console.log(result.description);
    console.log(`metadata: ${JSON.stringify(result.metadata)}`);
    console.log(
      `ms/frame median ${formatNumber(result.msPerFrame.median)} p95 ${formatNumber(result.msPerFrame.p95)} mean ${formatNumber(result.msPerFrame.mean)} stddev ${formatNumber(result.msPerFrame.stddev)}`,
    );
    console.log(
      `fps median ${formatNumber(result.fps.median)} p95 ${formatNumber(result.fps.p95)} mean ${formatNumber(result.fps.mean)}`,
    );
    printStageSummary(result);
    printMemorySummary(result);
  }
}

function printStageSummary(result) {
  const pipeline = result.pipelineMs;
  if (pipeline?.clearMs && pipeline?.totalMs) {
    console.log(
      `pipeline median ms clear=${formatNumber(pipeline.clearMs.median)} traversal=${formatNumber(pipeline.traversalMs?.median)} fogCull=${formatNumber(pipeline.fogCullMs?.median)} sort=${formatNumber(pipeline.sortMs?.median)} shadeRaster=${formatNumber(pipeline.shadeRasterMs?.median)} upload=${formatNumber(pipeline.uploadMs?.median)} total=${formatNumber(pipeline.totalMs.median)}`,
    );
    return;
  }
  const entries = Object.entries(result.stageMs ?? {});
  if (entries.length === 0) return;
  console.log(
    `stage median ms ${entries
      .map(([key, value]) => `${key}=${formatNumber(value.median)}`)
      .join(" ")}`,
  );
}

function printMemorySummary(result) {
  const heapUsed = result.memoryDelta?.heapUsed?.median;
  const arrayBuffers = result.memoryDelta?.arrayBuffers?.median;
  if (!(Number.isFinite(heapUsed) || Number.isFinite(arrayBuffers))) return;
  console.log(
    `memory delta bytes heapUsed=${formatNumber(heapUsed)} arrayBuffers=${formatNumber(arrayBuffers)}`,
  );
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(3) : "n/a";
}

function printHelp() {
  console.log(`Usage: bun run benchmarks/render-suite.mjs [options]

Options:
  --entry=src|dist|path      Import source under Bun, dist under Node, or a custom module path.
  --workload=name|all        Run one workload or all workloads. Default: all.
  --warmup=N                 Warmup frames before measurement. Default: 60.
  --samples=N                Number of measured samples. Default: 40.
  --frames=N                 Frames per sample. Default: 5.
  --profile-traversal        Enable detailed SceneTraversal project/assemble timers.
  --gc                       Run garbage collection between samples when exposed by runtime.
  --json=path                Write full machine-readable results.
  --list                     Print workload names.
  --help                     Print this help.
`);
}

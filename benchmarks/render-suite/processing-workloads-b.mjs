import { performance } from "node:perf_hooks";
import {
  createBenchmarkEventTarget,
  createOrthoCamera,
} from "./benchmark-helpers.mjs";

function createSkeletonState(EASEL) {
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
  return { bones, root, skeleton, mesh, vertexCount };
}

function createSkeletonRunState(state) {
  const { bones, root, skeleton, mesh, vertexCount } = state;
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
}

export function createSkeletonSkinningWorkload(EASEL) {
  return {
    name: "skeleton-skinning-update",
    description:
      "64-bone hierarchy and 2048 CPU-skinned vertices; bone matrix packing and weighted vertex transforms.",
    create() {
      return createSkeletonRunState(createSkeletonState(EASEL));
    },
  };
}

function createGeometrySetupState(EASEL) {
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
  shape.moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).lineTo(-1, -1);
  return { grid, positions, indices, shape };
}

function runGeometrySetup(state, EASEL, frame) {
  const { positions, indices, shape } = state;
  const geometry = new EASEL.Geometry();
  geometry.setPositions(positions.slice());
  geometry.index = indices;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const cylinder = new EASEL.CylinderGeometry(0.4, 0.25, 1, 24, 3);
  const torus = new EASEL.TorusGeometry(0.8, 0.18, 12, 32);
  const shapeGeometry = new EASEL.ShapeGeometry(shape, 12 + (frame & 3));
  return (
    (geometry.getAttribute("normal")?.count ?? 0) +
    (cylinder.index?.length ?? 0) +
    (torus.index?.length ?? 0) +
    (shapeGeometry.index?.length ?? 0)
  );
}

export function createGeometrySetupWorkload(EASEL) {
  return {
    name: "geometry-construction-normals",
    description:
      "Grid geometry construction, normal computation, bounds, and representative primitive constructors.",
    create() {
      const state = createGeometrySetupState(EASEL);
      let sink = 0;
      return {
        metadata: {
          grid: state.grid,
          vertices: state.grid * state.grid,
          indices: state.indices.length,
        },
        run(frame, timings) {
          const start = performance.now();
          sink += runGeometrySetup(state, EASEL, frame);
          timings.geometrySetupMs = performance.now() - start;
          timings.geometrySink = sink & 1;
        },
      };
    },
  };
}

export function createHelperControlsWorkload(EASEL) {
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
              preventDefault() {
                /* The deterministic wheel event has no browser default. */
              },
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

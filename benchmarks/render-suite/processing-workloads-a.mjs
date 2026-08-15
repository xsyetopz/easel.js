import { performance } from "node:perf_hooks";

function createAnimationNodes(EASEL) {
  const root = new EASEL.Group();
  const nodes = [];
  for (let i = 0; i < 64; i++) {
    const node = new EASEL.Group();
    node.name = `anim-node-${i}`;
    node.position.set(i & 7, (i >> 3) & 7, 0);
    nodes.push(node);
    root.add(node);
  }
  return { root, nodes };
}

function createAnimationTracks(EASEL, nodes, times, keyCount) {
  const fullTurn = Math.PI * 2;
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
      new EASEL.VectorTrack(`${nodes[i].name}.position`, times, positionValues),
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
  return tracks;
}

function createAnimationBindingState(EASEL) {
  const { root, nodes } = createAnimationNodes(EASEL);
  const keyCount = 32;
  const times = new Float32Array(keyCount);
  for (let i = 0; i < keyCount; i++) times[i] = (i / (keyCount - 1)) * 4;
  const tracks = createAnimationTracks(EASEL, nodes, times, keyCount);
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
      sink += nodes[0].position.x + nodes.at(-1).scale.y;
      timings.animationSink = sink & 1;
    },
  };
}

export function createAnimationBindingWorkload(EASEL) {
  return {
    name: "animation-binding-mix",
    description:
      "64-node hierarchy with 192 active tracks; track sampling, named binding lookup, mixer accumulation/apply.",
    create() {
      return createAnimationBindingState(EASEL);
    },
  };
}

function createRaycasterScene(EASEL) {
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
  return { scene, columns, rows, pointCount };
}

function createRaycasterState(EASEL) {
  const { scene, columns, rows, pointCount } = createRaycasterScene(EASEL);
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
        .set(Math.sin(frame * 0.017) * 0.04, Math.cos(frame * 0.019) * 0.04, -1)
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
}

export function createRaycasterWorkload(EASEL) {
  return {
    name: "raycaster-scene-query",
    description:
      "Dense mesh and point picking query; recursive traversal, local transforms, hit allocation, and hit sorting.",
    create() {
      return createRaycasterState(EASEL);
    },
  };
}

export function createCurvePathWorkload(EASEL) {
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

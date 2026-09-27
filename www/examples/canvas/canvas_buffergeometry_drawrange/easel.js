import {
  Attribute,
  BoxGeometry,
  BoxHelper,
  Geometry,
  Group,
  LineMaterial,
  LineSegments,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_buffergeometry_drawrange",
  upstream: "webgl_buffergeometry_drawrange",
  name: "buffergeometry / drawrange",
  category: "canvas",
  animated: true,
  description:
    "Up to 1,000 particles drift inside a rotating box and connect with fading line segments when they come close, using setDrawRange to draw only the live part of preallocated point and line buffers.",
  differences: [
    "EASEL has no blending modes, so the additive blending on the points, the connecting lines and the box outline becomes a plain overwrite: overlapping lines no longer add up to brighter crossings, and the points material uses layer 1 so the white dots stay on top of the lines that end on them.",
    "EASEL point size is an integer pixel radius without size attenuation, so size 3 (a 3-pixel-wide square that ignores distance in three.js) becomes a radius-1 disc about 3 pixels wide.",
    "Attribute.setUsage(DynamicDrawUsage) is a GPU buffer hint with no EASEL equivalent and is dropped; the attributes are republished with needsUpdate each frame as in three.js.",
    "Points and lines are rasterized on the CPU without anti-aliasing, and lines are 1 pixel wide.",
    "The particle update, the O(n^2) connection search and all drawn points and lines run on the CPU; a Bun stub-canvas run at 640x360 measured a median of about 7 to 16 ms per frame at the defaults and about 85 ms per frame with particleCount 1000 and minDistance 300.",
  ],
};
/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "showDots",
    label: "showDots",
    options: ["on", "off"],
    default: "on",
  },
  {
    type: "select",
    key: "showLines",
    label: "showLines",
    options: ["on", "off"],
    default: "on",
  },
  {
    type: "slider",
    key: "minDistance",
    label: "minDistance",
    min: 10,
    max: 300,
    step: 1,
    default: 150,
  },
  {
    type: "select",
    key: "limitConnections",
    label: "limitConnections",
    options: ["on", "off"],
    default: "off",
  },
  {
    type: "slider",
    key: "maxConnections",
    label: "maxConnections",
    min: 0,
    max: 30,
    step: 1,
    default: 20,
  },
  {
    type: "slider",
    key: "particleCount",
    label: "particleCount",
    min: 0,
    max: 1000,
    step: 1,
    default: 500,
  },
];

export function setup(canvas, params = {}) {
  const particlesData = [];

  const maxParticleCount = 1000;
  const r = 800;
  const rHalf = r / 2;

  const effectController = {
    showDots: (params.showDots ?? "on") === "on",
    showLines: (params.showLines ?? "on") === "on",
    minDistance: params.minDistance ?? 150,
    limitConnections: params.limitConnections === "on",
    maxConnections: params.maxConnections ?? 20,
    particleCount: params.particleCount ?? 500,
  };

  let particleCount = effectController.particleCount;

  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 4000,
  });
  camera.position.z = 1750;

  const orbit = new OrbitControls(camera, canvas);
  orbit.minDistance = 1000;
  orbit.maxDistance = 3000;

  const scene = new Scene();

  const group = new Group();
  scene.add(group);

  const box = new Mesh(new BoxGeometry(r, r, r));
  const helper = new BoxHelper(box);
  helper.material.color.hex = 0x474747;
  // EASEL has no blending modes; additive blending becomes normal blending.
  helper.material.transparent = true;
  group.add(helper);

  const segments = maxParticleCount * maxParticleCount;

  const positions = new Float32Array(segments * 3);
  const colors = new Float32Array(segments * 3);

  const pMaterial = new PointsMaterial({
    color: 0xffffff,
    // EASEL size is an integer pixel radius without attenuation; a radius of
    // 1 draws a disc about 3 pixels wide, like three.js size 3.
    size: 1,
    transparent: true,
    // Additive blending keeps the white dots on top of the lines that end on
    // them; without blending modes, draw the dots after the lines instead.
    layer: 1,
  });

  const particles = new Geometry();
  const particlePositions = new Float32Array(maxParticleCount * 3);

  for (let i = 0; i < maxParticleCount; i++) {
    const x = Math.random() * r - r / 2;
    const y = Math.random() * r - r / 2;
    const z = Math.random() * r - r / 2;

    particlePositions[i * 3] = x;
    particlePositions[i * 3 + 1] = y;
    particlePositions[i * 3 + 2] = z;

    // add it to the geometry
    particlesData.push({
      velocity: new Vector3(
        -1 + Math.random() * 2,
        -1 + Math.random() * 2,
        -1 + Math.random() * 2,
      ),
      numConnections: 0,
    });
  }

  particles.setDrawRange(0, particleCount);
  particles.setAttribute("position", new Attribute(particlePositions, 3));

  // create the particle system
  const pointCloud = new Points(particles, pMaterial);
  pointCloud.visible = effectController.showDots;
  group.add(pointCloud);

  const geometry = new Geometry();

  geometry.setAttribute("position", new Attribute(positions, 3));
  geometry.setAttribute("color", new Attribute(colors, 3));

  geometry.computeBoundingSphere();

  geometry.setDrawRange(0, 0);

  const material = new LineMaterial({
    vertexColors: true,
    transparent: true,
  });

  const linesMesh = new LineSegments(geometry, material);
  linesMesh.visible = effectController.showLines;
  group.add(linesMesh);

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  function animate() {
    let vertexpos = 0;
    let colorpos = 0;
    let numConnected = 0;

    for (let i = 0; i < particleCount; i++) particlesData[i].numConnections = 0;

    for (let i = 0; i < particleCount; i++) {
      // get the particle
      const particleData = particlesData[i];

      particlePositions[i * 3] += particleData.velocity.x;
      particlePositions[i * 3 + 1] += particleData.velocity.y;
      particlePositions[i * 3 + 2] += particleData.velocity.z;

      if (
        particlePositions[i * 3 + 1] < -rHalf ||
        particlePositions[i * 3 + 1] > rHalf
      )
        particleData.velocity.y = -particleData.velocity.y;

      if (particlePositions[i * 3] < -rHalf || particlePositions[i * 3] > rHalf)
        particleData.velocity.x = -particleData.velocity.x;

      if (
        particlePositions[i * 3 + 2] < -rHalf ||
        particlePositions[i * 3 + 2] > rHalf
      )
        particleData.velocity.z = -particleData.velocity.z;

      if (
        effectController.limitConnections &&
        particleData.numConnections >= effectController.maxConnections
      )
        continue;

      // Check collision
      for (let j = i + 1; j < particleCount; j++) {
        const particleDataB = particlesData[j];
        if (
          effectController.limitConnections &&
          particleDataB.numConnections >= effectController.maxConnections
        )
          continue;

        const dx = particlePositions[i * 3] - particlePositions[j * 3];
        const dy = particlePositions[i * 3 + 1] - particlePositions[j * 3 + 1];
        const dz = particlePositions[i * 3 + 2] - particlePositions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < effectController.minDistance) {
          particleData.numConnections++;
          particleDataB.numConnections++;

          const alpha = 1.0 - dist / effectController.minDistance;

          positions[vertexpos++] = particlePositions[i * 3];
          positions[vertexpos++] = particlePositions[i * 3 + 1];
          positions[vertexpos++] = particlePositions[i * 3 + 2];

          positions[vertexpos++] = particlePositions[j * 3];
          positions[vertexpos++] = particlePositions[j * 3 + 1];
          positions[vertexpos++] = particlePositions[j * 3 + 2];

          colors[colorpos++] = alpha;
          colors[colorpos++] = alpha;
          colors[colorpos++] = alpha;

          colors[colorpos++] = alpha;
          colors[colorpos++] = alpha;
          colors[colorpos++] = alpha;

          numConnected++;
        }
      }
    }

    linesMesh.geometry.setDrawRange(0, numConnected * 2);
    linesMesh.geometry.getAttribute("position").needsUpdate = true;
    linesMesh.geometry.getAttribute("color").needsUpdate = true;

    pointCloud.geometry.getAttribute("position").needsUpdate = true;

    render();
  }

  function render() {
    const time = Date.now() * 0.001;

    group.rotation.y = time * 0.1;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(animate);

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    update(next) {
      if (next.showDots !== undefined) {
        effectController.showDots = next.showDots === "on";
        pointCloud.visible = effectController.showDots;
      }
      if (next.showLines !== undefined) {
        effectController.showLines = next.showLines === "on";
        linesMesh.visible = effectController.showLines;
      }
      if (next.minDistance !== undefined)
        effectController.minDistance = next.minDistance;
      if (next.limitConnections !== undefined)
        effectController.limitConnections = next.limitConnections === "on";
      if (next.maxConnections !== undefined)
        effectController.maxConnections = next.maxConnections;
      if (next.particleCount !== undefined) {
        effectController.particleCount = next.particleCount;
        particleCount = next.particleCount;
        particles.setDrawRange(0, particleCount);
      }
    },
    cleanup() {
      animation.cleanup();
      orbit.dispose();
      box.geometry.dispose();
      helper.dispose();
      particles.dispose();
      pMaterial.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const particles = new EASEL.Geometry();
particles.setDrawRange(0, particleCount);
particles.setAttribute("position", new EASEL.Attribute(particlePositions, 3));
const pointCloud = new EASEL.Points(
  particles,
  new EASEL.PointsMaterial({ color: 0xffffff, size: 1, transparent: true }),
);

const geometry = new EASEL.Geometry();
geometry.setAttribute("position", new EASEL.Attribute(positions, 3));
geometry.setAttribute("color", new EASEL.Attribute(colors, 3));
geometry.setDrawRange(0, 0);
const linesMesh = new EASEL.LineSegments(
  geometry,
  new EASEL.LineMaterial({ vertexColors: true, transparent: true }),
);

linesMesh.geometry.setDrawRange(0, numConnected * 2);
linesMesh.geometry.getAttribute("position").needsUpdate = true;
linesMesh.geometry.getAttribute("color").needsUpdate = true;
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };

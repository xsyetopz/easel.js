// Adapted from three.js r186 examples/webgl_buffergeometry_drawrange.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

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

  const camera = new THREE.PerspectiveCamera(
    45,
    canvas.width / canvas.height,
    1,
    4000,
  );
  camera.position.z = 1750;

  const controls = new OrbitControls(camera, canvas);
  controls.minDistance = 1000;
  controls.maxDistance = 3000;

  const scene = new THREE.Scene();

  const group = new THREE.Group();
  scene.add(group);

  const helper = new THREE.BoxHelper(
    new THREE.Mesh(new THREE.BoxGeometry(r, r, r)),
  );
  helper.material.color.setHex(0x474747);
  helper.material.blending = THREE.AdditiveBlending;
  helper.material.transparent = true;
  group.add(helper);

  const segments = maxParticleCount * maxParticleCount;

  const positions = new Float32Array(segments * 3);
  const colors = new Float32Array(segments * 3);

  const pMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 3,
    blending: THREE.AdditiveBlending,
    transparent: true,
    sizeAttenuation: false,
  });

  const particles = new THREE.BufferGeometry();
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
      velocity: new THREE.Vector3(
        -1 + Math.random() * 2,
        -1 + Math.random() * 2,
        -1 + Math.random() * 2,
      ),
      numConnections: 0,
    });
  }

  particles.setDrawRange(0, particleCount);
  particles.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );

  // create the particle system
  const pointCloud = new THREE.Points(particles, pMaterial);
  pointCloud.visible = effectController.showDots;
  group.add(pointCloud);

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage),
  );

  geometry.computeBoundingSphere();

  geometry.setDrawRange(0, 0);

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
  });

  const linesMesh = new THREE.LineSegments(geometry, material);
  linesMesh.visible = effectController.showLines;
  group.add(linesMesh);

  //

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

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
    linesMesh.geometry.attributes.position.needsUpdate = true;
    linesMesh.geometry.attributes.color.needsUpdate = true;

    pointCloud.geometry.attributes.position.needsUpdate = true;

    render();
  }

  function render() {
    const time = Date.now() * 0.001;

    group.rotation.y = time * 0.1;
    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(animate);

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
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
      controls.dispose();
      helper.geometry.dispose();
      helper.material.dispose();
      particles.dispose();
      pMaterial.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };

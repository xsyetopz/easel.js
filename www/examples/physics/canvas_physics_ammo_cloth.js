import {
  AmbientLight,
  BoxGeometry,
  Geometry,
  LambertMaterial,
  Mesh,
  OrbitControls,
  ParticleWorld,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "physics_ammo_cloth",
  name: "Ammo cloth",
  category: "physics",
  description:
    "A deterministic CPU particle cloth uses pinned anchors, distance constraints, gravity, and Canvas2D rasterization without Ammo WASM.",
};

export const controls = [];

function buildGeometry(width, height, segmentsX, segmentsY) {
  const columns = segmentsX + 1;
  const rows = segmentsY + 1;
  const positions = new Float32Array(columns * rows * 3);
  const uvs = new Float32Array(columns * rows * 2);
  const indices = [];
  let positionOffset = 0;
  let uvOffset = 0;
  for (let row = 0; row < rows; row++) {
    const v = row / segmentsY;
    for (let column = 0; column < columns; column++) {
      const u = column / segmentsX;
      positions[positionOffset++] = (u - 0.5) * width;
      positions[positionOffset++] = (1 - v) * height;
      positions[positionOffset++] = 0;
      uvs[uvOffset++] = u;
      uvs[uvOffset++] = 1 - v;
    }
  }
  for (let row = 0; row < segmentsY; row++) {
    for (let column = 0; column < segmentsX; column++) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }
  const geometry = new Geometry().setPositions(positions).setUVs(uvs);
  geometry.index = indices;
  geometry.computeVertexNormals();
  return geometry;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const clothWidth = 4;
  const clothHeight = 3;
  const segmentsX = 20;
  const segmentsY = 15;
  const clothOrigin = new Vector3(0, 2.4, 0);
  const scene = new Scene();
  scene.background = 0xbfd1e5;
  const camera = new PerspectiveCamera({
    fov: 55,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(7, 4, 10);
  camera.lookAt(new Vector3(0, 2, 0));
  const renderer = new Renderer({ canvas, width, height });
  const controlsInstance = new OrbitControls(camera, canvas);
  controlsInstance.target.set(0, 2, 0);
  controlsInstance.update();
  scene.add(new AmbientLight(0xffffff, 0.65));
  const floor = new Mesh(
    new BoxGeometry(12, 0.4, 12),
    new LambertMaterial({ color: 0xe7ecef }),
  );
  floor.position.y = -1.8;
  scene.add(floor);
  const arm = new Mesh(
    new BoxGeometry(5.2, 0.16, 0.16),
    new LambertMaterial({ color: 0x4e86c6 }),
  );
  arm.position.set(0, clothOrigin.y + clothHeight, clothOrigin.z);
  scene.add(arm);

  const geometry = buildGeometry(clothWidth, clothHeight, segmentsX, segmentsY);
  const cloth = new Mesh(
    geometry,
    new LambertMaterial({ color: 0xf2f2f2, side: Side.Double }),
  );
  cloth.position.copy(clothOrigin);
  scene.add(cloth);

  const world = new ParticleWorld({
    gravity: new Vector3(0, -9.81, 0),
    fixedTimeStep: 1 / 60,
    maxSubSteps: 8,
    iterations: 6,
    groundY: -1.6,
    damping: 0.998,
    groundRestitution: 0.05,
    groundFriction: 0.9,
  });
  const particles = [];
  const initialPositions = [];
  for (let row = 0; row <= segmentsY; row++) {
    for (let column = 0; column <= segmentsX; column++) {
      const position = new Vector3(
        clothOrigin.x + (column / segmentsX - 0.5) * clothWidth,
        clothOrigin.y + (1 - row / segmentsY) * clothHeight,
        clothOrigin.z,
      );
      const particle = world.addParticle({
        position,
        mass: row === 0 ? 0 : 0.08,
      });
      particles.push(particle);
      initialPositions.push(position.clone());
    }
  }
  const columns = segmentsX + 1;
  for (let row = 0; row <= segmentsY; row++) {
    for (let column = 0; column <= segmentsX; column++) {
      const index = row * columns + column;
      if (column < segmentsX) {
        world.addDistanceConstraint(particles[index], particles[index + 1], {
          stiffness: 0.95,
        });
      }
      if (row < segmentsY) {
        world.addDistanceConstraint(
          particles[index],
          particles[index + columns],
          {
            stiffness: 0.95,
          },
        );
      }
      if (row < segmentsY && column < segmentsX) {
        world.addDistanceConstraint(
          particles[index],
          particles[index + columns + 1],
          { stiffness: 0.75 },
        );
      }
    }
  }
  const leftAnchor = particles[0];
  const rightAnchor = particles[segmentsX];
  let armDirection = 0;
  let armOffset = 0;
  const reset = () => {
    for (let index = 0; index < particles.length; index++) {
      particles[index].position.copy(initialPositions[index]);
      particles[index].velocity.set(0, 0, 0);
    }
    setArm(0);
  };
  const setArm = (offset) => {
    armOffset = Math.max(-1.1, Math.min(1.1, offset));
    arm.position.x = armOffset;
    world.pin(
      leftAnchor,
      new Vector3(
        -clothWidth / 2 + armOffset,
        clothOrigin.y + clothHeight,
        clothOrigin.z,
      ),
    );
    world.pin(
      rightAnchor,
      new Vector3(
        clothWidth / 2 + armOffset,
        clothOrigin.y + clothHeight,
        clothOrigin.z,
      ),
    );
  };
  setArm(0);
  const onKeyDown = (event) => {
    const key = String(event.key).toLowerCase();
    if (key === "q") armDirection = -1;
    if (key === "a") armDirection = 1;
  };
  const onKeyUp = (event) => {
    const key = String(event.key).toLowerCase();
    if (key === "q" || key === "a") armDirection = 0;
  };
  globalThis.addEventListener?.("keydown", onKeyDown);
  globalThis.addEventListener?.("keyup", onKeyUp);

  let previousTimestamp;
  let animationFrame;
  const requestFrame =
    typeof globalThis.requestAnimationFrame === "function"
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : () => 0;
  const cancelFrame =
    typeof globalThis.cancelAnimationFrame === "function"
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : () => undefined;
  const updateGeometry = () => {
    const positions = geometry.getAttribute("position");
    if (!positions) return;
    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index];
      positions.setXYZ(
        index,
        particle.position.x - clothOrigin.x,
        particle.position.y - clothOrigin.y,
        particle.position.z - clothOrigin.z,
      );
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  };
  function animate(timestamp) {
    animationFrame = requestFrame(animate);
    const delta =
      previousTimestamp === undefined
        ? 0
        : Math.min(0.1, Math.max(0, (timestamp - previousTimestamp) / 1000));
    previousTimestamp = timestamp;
    if (delta > 0) {
      setArm(armOffset + armDirection * delta * 1.5);
      world.update(delta);
    }
    updateGeometry();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate(0);
  return {
    update(params = {}) {
      if (params.arm !== undefined) setArm(Number(params.arm) || 0);
      if (params.reset === 1 || params.reset === "1") reset();
    },
    cleanup() {
      if (animationFrame !== undefined) cancelFrame(animationFrame);
      globalThis.removeEventListener?.("keydown", onKeyDown);
      globalThis.removeEventListener?.("keyup", onKeyUp);
      controlsInstance.dispose();
      world.dispose();
      scene.clear();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const cloth = new EASEL.ParticleWorld({ gravity: new EASEL.Vector3(0, -9.81, 0) });
const particle = cloth.addParticle({ position, mass: 0.08 });
cloth.addDistanceConstraint(anchor, particle, { stiffness: 0.95 });
cloth.update(deltaSeconds);
clothGeometry.getAttribute("position").needsUpdate = true;`;

export const threeSource = `import * as THREE from "three";
import Ammo from "ammojs-typed";
const physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
const clothSoftBody = softBodyHelpers.CreatePatch(physicsWorld.getWorldInfo(), corner00, corner01, corner10, corner11, segmentsX + 1, segmentsY + 1, 0, true);
physicsWorld.addSoftBody(clothSoftBody, 1, -1);
physicsWorld.stepSimulation(deltaSeconds, 10);`;

export const example = { meta, controls, setup, easelSource, threeSource };

import * as EASEL from "@/index.js";

export const meta = {
  id: "repeat-wrapping",
  name: "Repeat Wrapping",
  category: "textures",
  description: "Shows Wrapping.Repeat with adjustable UV tiling.",
};

export const controls = [
  {
    type: "slider",
    key: "repeatU",
    label: "Repeat U",
    min: 1,
    max: 5,
    step: 1,
    default: 3,
  },
  {
    type: "slider",
    key: "repeatV",
    label: "Repeat V",
    min: 1,
    max: 5,
    step: 1,
    default: 3,
  },
];

function createCheckerTexture() {
  const size = 16;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const checker = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      data[i] = checker ? 200 : 40;
      data[i + 1] = checker ? 180 : 60;
      data[i + 2] = checker ? 220 : 80;
      data[i + 3] = 255;
    }
  }
  const tex = new EASEL.DataTexture(data, size, size);
  tex.wrapS = EASEL.Wrapping.Repeat;
  tex.wrapT = EASEL.Wrapping.Repeat;
  return tex;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
export function setup(canvas, params = {}) {
  const width = canvas.width;
  const height = canvas.height;

  const scene = new EASEL.Scene();
  const camera = new EASEL.PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 2, 5);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.5));
  const light = new EASEL.DirectionalLight(0xffffff, 0.7);
  light.position.set(3, 5, 4);
  scene.add(light);

  const texture = createCheckerTexture();
  const material = new EASEL.LambertMaterial({ color: 0xffffff });
  material.map = texture;

  let repeatU = params.repeatU ?? 3;
  let repeatV = params.repeatV ?? 3;

  function buildPlane() {
    return new EASEL.PlaneGeometry(4, 4, 1, 1);
  }

  function scaleUVs(geom, uScale, vScale) {
    const uv = geom.getAttribute("uv");
    if (!uv) return;
    const arr = uv.array;
    for (let i = 0; i < arr.length; i += 2) {
      arr[i] *= uScale;
      arr[i + 1] *= vScale;
    }
    uv.needsUpdate = true;
  }

  let geom = buildPlane();
  scaleUVs(geom, repeatU, repeatV);
  let mesh = new EASEL.Mesh(geom, material);
  mesh.rotation.x = -0.5;
  scene.add(mesh);

  const clock = new EASEL.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.delta;
    mesh.rotation.z += 0.2 * dt;
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
    update(newParams) {
      let rebuild = false;
      if (newParams.repeatU !== undefined && newParams.repeatU !== repeatU) {
        repeatU = newParams.repeatU;
        rebuild = true;
      }
      if (newParams.repeatV !== undefined && newParams.repeatV !== repeatV) {
        repeatV = newParams.repeatV;
        rebuild = true;
      }
      if (rebuild) {
        scene.remove(mesh);
        geom = buildPlane();
        scaleUVs(geom, repeatU, repeatV);
        mesh = new EASEL.Mesh(geom, material);
        mesh.rotation.x = -0.5;
        scene.add(mesh);
      }
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const tex = new EASEL.DataTexture(data, 16, 16);
tex.wrapS = EASEL.Wrapping.Repeat;
tex.wrapT = EASEL.Wrapping.Repeat;

const material = new EASEL.LambertMaterial({ color: 0xffffff });
material.map = tex;

const plane = new EASEL.PlaneGeometry(4, 4);
const uv = plane.getAttribute("uv");
for (let i = 0; i < uv.array.length; i += 2) {
  uv.array[i] *= 3;
  uv.array[i+1] *= 3;
}

const mesh = new EASEL.Mesh(plane, material);
scene.add(mesh);`;

export const threeSource = `import * as THREE from "three";

const tex = new THREE.DataTexture(data, 16, 16);
tex.wrapS = THREE.RepeatWrapping;
tex.wrapT = THREE.RepeatWrapping;
tex.needsUpdate = true;

const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
material.map = tex;

const plane = new THREE.PlaneGeometry(4, 4);
const uv = plane.getAttribute("uv");
for (let i = 0; i < uv.array.length; i += 2) {
  uv.array[i] *= 3;
  uv.array[i+1] *= 3;
}

const mesh = new THREE.Mesh(plane, material);
scene.add(mesh);`;

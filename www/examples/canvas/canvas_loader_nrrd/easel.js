import {
  BasicMaterial,
  BoxGeometry,
  BoxHelper,
  DataTexture,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  NRRDLoader,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  Side,
  TrackballControls,
} from "@/index.js";

import stentBase64 from "../../../../assets/nrrd/stent.nrrd.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

const stentBytes = Uint8Array.from(atob(stentBase64), (value) =>
  value.charCodeAt(0),
);

export const meta = {
  id: "canvas_loader_nrrd",
  upstream: "webgl_loader_nrrd",
  name: "loader / nrrd",
  category: "canvas",
  animated: true,
  description:
    "Load an NRRD scalar volume and show three orthogonal slices inside its bounding box, with index, threshold, and window sliders.",
  differences: [
    "The volume is stent.nrrd (public domain) instead of I.nrrd, whose license is unknown; the slider ranges come from stent.nrrd, whose samples run from 0 to 1, so the threshold and window sliders with upstream's step of 1 only toggle between 0 and 1.",
    "EASEL's NRRDLoader cannot decode gzip payloads, so the EASEL side inflates the same stent.nrrd bytes with DecompressionStream and parses the result as raw data; the bounding box, which needs only the header, draws on the first frame and the slices appear a moment later.",
    "EASEL has no Volume.extractSlice or VolumeSlice, so the example repaints each slice itself from NRRDVolume.data into a DataTexture on a PlaneGeometry, using three.js's threshold and window formulas, and only when a slider changes.",
    "EASEL textures are capped at 128x128 texels, so the 256-sample edges of the x and y slices are sampled nearest-neighbor at half resolution.",
  ],
};

// Upstream builds these sliders from the loaded volume; these are the
// stent.nrrd values (RASDimensions 128 x 128 x 256, min 0, max 1).
/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "slider",
    key: "indexX",
    label: "indexX",
    min: 0,
    max: 128,
    step: 1,
    default: 64,
  },
  {
    type: "slider",
    key: "indexY",
    label: "indexY",
    min: 0,
    max: 128,
    step: 1,
    default: 64,
  },
  {
    type: "slider",
    key: "indexZ",
    label: "indexZ",
    min: 0,
    max: 256,
    step: 1,
    default: 64,
  },
  {
    type: "slider",
    key: "lowerThreshold",
    label: "Lower Threshold",
    min: 0,
    max: 1,
    step: 1,
    default: 0,
  },
  {
    type: "slider",
    key: "upperThreshold",
    label: "Upper Threshold",
    min: 0,
    max: 1,
    step: 1,
    default: 1,
  },
  {
    type: "slider",
    key: "windowLow",
    label: "Window Low",
    min: 0,
    max: 1,
    step: 1,
    default: 0,
  },
  {
    type: "slider",
    key: "windowHigh",
    label: "Window High",
    min: 0,
    max: 1,
    step: 1,
    default: 1,
  },
];

function readNrrdSizes(bytes) {
  const header = new TextDecoder().decode(bytes.subarray(0, 1024));
  const match = /^sizes:\s*(\d+)\s+(\d+)\s+(\d+)/mu.exec(header);
  if (!match) throw new Error("stent.nrrd header has no sizes line");
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

async function inflateNrrd(bytes) {
  let headerEnd = 0;
  while (
    headerEnd < bytes.length - 1 &&
    !(bytes[headerEnd] === 10 && bytes[headerEnd + 1] === 10)
  ) {
    headerEnd++;
  }
  const header = new TextDecoder()
    .decode(bytes.subarray(0, headerEnd))
    .replace(/^encoding:\s*(gzip|gz)\s*$/imu, "encoding: raw");
  const stream = new Blob([bytes.subarray(headerEnd + 2)])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const payload = new Uint8Array(await new Response(stream).arrayBuffer());
  const head = new TextEncoder().encode(`${header}\n\n`);
  const output = new Uint8Array(head.length + payload.length);
  output.set(head);
  output.set(payload, head.length);
  return output;
}

export function setup(canvas, params) {
  let disposed = false;
  let state = { ...params };
  const resources = [];

  const camera = new PerspectiveCamera({
    fov: 60,
    aspect: canvas.width / canvas.height,
    near: 0.01,
    far: 1e10,
  });
  camera.position.z = 300;

  const scene = new Scene();

  scene.add(camera);

  // light

  const hemiLight = new HemisphereLight(0xffffff, 0x000000, 3);
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(200, 200, 200);
  scene.add(dirLight);

  let volume;
  let slices = [];
  const thresholds = {
    lowerThreshold: 0,
    upperThreshold: 1,
    windowLow: 0,
    windowHigh: 1,
  };

  // Mirrors three.js Volume.extractPerpendicularPlane for a volume whose
  // matrix is the identity, which is the case for stent.nrrd.
  function createSlice(axis, index, key) {
    const { xLength, yLength, zLength, spacing } = volume;
    // Like three.js Volume.access, this indexes the flat data without a
    // bounds check, so the index slider maximum reads past the plane too.
    const voxel = (x, y, z) => volume.data[x + xLength * (y + yLength * z)];
    const plane = {
      x: {
        iLength: zLength,
        jLength: yLength,
        width: zLength * spacing[2],
        height: yLength * spacing[1],
        access: (i, j, k) => voxel(k, yLength - 1 - j, zLength - 1 - i),
        length: xLength,
      },
      y: {
        iLength: xLength,
        jLength: zLength,
        width: xLength * spacing[0],
        height: zLength * spacing[2],
        access: (i, j, k) => voxel(i, k, j),
        length: yLength,
      },
      z: {
        iLength: xLength,
        jLength: yLength,
        width: xLength * spacing[0],
        height: yLength * spacing[1],
        access: (i, j, k) => voxel(i, yLength - 1 - j, k),
        length: zLength,
      },
    }[axis];
    const geometry = new PlaneGeometry(plane.width, plane.height);
    const material = new BasicMaterial({
      side: Side.Double,
      transparent: true,
    });
    const mesh = new Mesh(geometry, material);
    if (axis === "x") mesh.rotation.y = Math.PI / 2;
    if (axis === "y") mesh.rotation.x = -Math.PI / 2;
    resources.push(geometry, material);
    return { axis, key, index, plane, mesh };
  }

  function positionSlice(slice) {
    const offset = (slice.plane.length - 1) / 2;
    slice.mesh.position.set(0, 0, 0);
    slice.mesh.position[slice.axis] = slice.index - offset;
  }

  function repaint(slice) {
    const { iLength, jLength, access } = slice.plane;
    positionSlice(slice);
    const { lowerThreshold, upperThreshold, windowLow, windowHigh } =
      thresholds;
    const width = Math.min(128, iLength);
    const height = Math.min(128, jLength);
    const pixels = new Uint8ClampedArray(width * height * 4);
    let pixelCount = 0;
    for (let row = 0; row < height; row++) {
      const j = Math.floor((row * jLength) / height);
      for (let column = 0; column < width; column++) {
        const i = Math.floor((column * iLength) / width);
        let value = access(i, j, slice.index);
        let alpha = 0xff;
        //apply threshold
        alpha =
          upperThreshold >= value ? (lowerThreshold <= value ? alpha : 0) : 0;
        //apply window level
        value = Math.floor(
          (255 * (value - windowLow)) / (windowHigh - windowLow),
        );
        value = value > 255 ? 255 : value < 0 ? 0 : value | 0;

        pixels[4 * pixelCount] = value;
        pixels[4 * pixelCount + 1] = value;
        pixels[4 * pixelCount + 2] = value;
        pixels[4 * pixelCount + 3] = alpha;
        pixelCount++;
      }
    }
    const previous = slice.mesh.material.map;
    const texture = new DataTexture(pixels, width, height);
    texture.buildBrightnessLevels();
    slice.mesh.material.map = texture;
    slice.mesh.material.needsUpdate = true;
    previous?.dispose();
  }

  function update(next) {
    state = { ...state, ...next };
    if (!volume) return;
    for (const slice of slices) {
      const index = Number(state[slice.key] ?? slice.index);
      if (index !== slice.index) {
        slice.index = index;
        repaint(slice);
      }
    }

    let repaintAll = false;
    for (const key of Object.keys(thresholds)) {
      const value = Number(state[key] ?? thresholds[key]);
      if (value !== thresholds[key]) {
        thresholds[key] = value;
        repaintAll = true;
      }
    }
    if (repaintAll) for (const slice of slices) repaint(slice);
  }

  //box helper to see the extend of the volume
  // The box needs only the plain-text header, so it is drawn before the
  // gzip payload finishes inflating.
  const [xLength, yLength, zLength] = readNrrdSizes(stentBytes);
  const boxGeometry = new BoxGeometry(xLength, yLength, zLength);
  const boxMaterial = new BasicMaterial({ color: 0x00ff00 });
  const cube = new Mesh(boxGeometry, boxMaterial);
  cube.visible = false;
  const box = new BoxHelper(cube);
  scene.add(box);
  scene.add(cube);
  resources.push(boxGeometry, boxMaterial, box);

  const loader = new NRRDLoader();
  inflateNrrd(stentBytes).then((bytes) => {
    if (disposed) return;
    volume = loader.parse(bytes);
    thresholds.lowerThreshold = volume.min;
    thresholds.upperThreshold = volume.max;
    thresholds.windowLow = volume.windowLow;
    thresholds.windowHigh = volume.windowHigh;

    //z plane
    const sliceZ = createSlice("z", Math.floor(volume.zLength / 4), "indexZ");
    scene.add(sliceZ.mesh);

    //y plane
    const sliceY = createSlice("y", Math.floor(volume.yLength / 2), "indexY");
    scene.add(sliceY.mesh);

    //x plane
    const sliceX = createSlice("x", Math.floor(volume.xLength / 2), "indexX");
    scene.add(sliceX.mesh);

    slices = [sliceX, sliceY, sliceZ];
    for (const slice of slices) repaint(slice);
    update(state);
    // The volume arrives after the first frame; draw it even while paused.
    animate();
  });

  // renderer

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const trackball = new TrackballControls(camera, canvas);
  trackball.minDistance = 100;
  trackball.maxDistance = 500;
  trackball.rotateSpeed = 5.0;
  trackball.zoomSpeed = 5;
  trackball.panSpeed = 2;

  function animate() {
    trackball.update();

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

      trackball.handleResize();
    },
    update,
    cleanup() {
      disposed = true;
      animation.cleanup();
      trackball.dispose();
      for (const slice of slices) slice.mesh.material.map?.dispose();
      for (const resource of resources) resource.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const volume = new EASEL.NRRDLoader().parse(rawNrrdBytes);
const texture = new EASEL.DataTexture(slicePixels, 128, 128);
texture.buildBrightnessLevels();
const slice = new EASEL.Mesh(
  new EASEL.PlaneGeometry(volume.xLength, volume.yLength),
  new EASEL.BasicMaterial({ map: texture, side: EASEL.Side.Double, transparent: true }),
);
scene.add(slice);

const trackball = new EASEL.TrackballControls(camera, canvas);
trackball.minDistance = 100;
trackball.maxDistance = 500;`;

export const example = { meta, controls, setup, easelSource };

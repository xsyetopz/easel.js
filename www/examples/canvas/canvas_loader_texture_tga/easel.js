import {
  AmbientLight,
  BoxGeometry,
  DataTexture,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  TGALoader,
} from "@/index.js";

import crateColor8Base64 from "../../../../assets/textures/crate_color8.tga.base64?raw";
import crateGrey8Base64 from "../../../../assets/textures/crate_grey8.tga.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

function decodeBase64(base64) {
  return Uint8Array.from(atob(base64), (value) => value.charCodeAt(0)).buffer;
}

export const meta = {
  id: "canvas_loader_texture_tga",
  upstream: "webgl_loader_texture_tga",
  name: "loader / texture / tga",
  category: "canvas",
  animated: true,
  description:
    "Two lit crates side by side, textured with a greyscale and a color-mapped TGA image decoded by TGALoader, with orbit controls.",
  differences: [
    "MeshPhongMaterial becomes LambertMaterial because EASEL has no Phong shading, so the crates show no specular highlight.",
    "EASEL has no createDataTexture on DataTextureLoader, so the port wraps TGALoader.parse output in a DataTexture and builds its brightness levels, as EASEL's DataTextureLoader.load does.",
    "EASEL Texture.colorSpace rejects SRGBColorSpace because EASEL samples texture bytes without color conversion, so the assignment is dropped and lighting runs in display color space.",
    "EASEL caches the 256x256 TGA images at 128x128 and samples them nearest-neighbor with affine warping, so the wood grain is blockier and bends across each face.",
    "Edges are aliased because EASEL has no antialiasing.",
  ],
};
export const controls = [];

export function setup(canvas) {
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: canvas.width / canvas.height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1, 5);

  const scene = new Scene();

  //

  const loader = new TGALoader();
  const geometry = new BoxGeometry();

  // add box 1 - grey8 texture

  // The checked-in TGA files replace the relative texture URLs, so loading needs no network.
  const texData1 = loader.parse(decodeBase64(crateGrey8Base64));
  const texture1 = new DataTexture(
    texData1.data,
    texData1.width,
    texData1.height,
  );
  texture1.buildBrightnessLevels();
  const material1 = new LambertMaterial({ color: 0xffffff, map: texture1 });

  const mesh1 = new Mesh(geometry, material1);
  mesh1.position.x = -1;

  scene.add(mesh1);

  // add box 2 - tga texture

  const texData2 = loader.parse(decodeBase64(crateColor8Base64));
  const texture2 = new DataTexture(
    texData2.data,
    texData2.width,
    texData2.height,
  );
  texture2.buildBrightnessLevels();
  const material2 = new LambertMaterial({ color: 0xffffff, map: texture2 });

  const mesh2 = new Mesh(geometry, material2);
  mesh2.position.x = 1;

  scene.add(mesh2);

  //

  const ambientLight = new AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const light = new DirectionalLight(0xffffff, 2.5);
  light.position.set(1, 1, 1);
  scene.add(light);

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  const orbit = new OrbitControls(camera, canvas);
  orbit.enableZoom = false;

  const animation = createExampleAnimationLoop(() => {
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    },
    cleanup() {
      animation.cleanup();
      orbit.dispose();
      geometry.dispose();
      material1.dispose();
      material2.dispose();
      texture1.dispose();
      texture2.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const loader = new EASEL.TGALoader();
const texData = loader.parse(tgaBuffer);
const texture = new EASEL.DataTexture(texData.data, texData.width, texData.height);
texture.buildBrightnessLevels();

const material = new EASEL.LambertMaterial({ color: 0xffffff, map: texture });
const mesh = new EASEL.Mesh(new EASEL.BoxGeometry(), material);
mesh.position.x = 1;
scene.add(mesh);

scene.add(new EASEL.AmbientLight(0xffffff, 1.5));
const light = new EASEL.DirectionalLight(0xffffff, 2.5);
light.position.set(1, 1, 1);
scene.add(light);

renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };

import {
  AmbientLight,
  BasicMaterial,
  BoxGeometry,
  DirectionalLight,
  GridHelper,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Renderer,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
} from "@/index.js";

import squareOutlineBase64 from "../../../../assets/textures/square-outline-textured.png.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export const meta = {
  id: "canvas_interactive_voxelpainter",
  upstream: "webgl_interactive_voxelpainter",
  name: "interactive / voxelpainter",
  category: "canvas",
  animated: true,
  description:
    "Click the grid to stack textured orange voxels where a translucent red roll-over cube snaps to the picked face; Shift-click removes a voxel.",
  differences: [
    "The upstream page tracks Shift with document keydown and keyup listeners; both ports read shiftKey from the pointerdown event so every listener stays on the canvas.",
    "EASEL's TextureLoader.load returns nothing, so the port assigns the square-outline map in the load callback, where it also sets colorSpace and re-caches the already decoded texels with update(); voxels placed before the data-URL PNG is decoded draw untextured until it arrives.",
    "The 16x16 square-outline texture is sampled nearest-neighbor with affine warping instead of being filtered and perspective-correct.",
    "EASEL has discrete opacity levels, so the roll-over cube's 0.5 opacity becomes level 4 of 8.",
  ],
};
export const controls = [];

export function setup(canvas) {
  let disposed = false;
  let isShiftDown = false;

  const objects = [];

  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 10000,
  });
  camera.position.set(500, 800, 1300);
  camera.lookAt(0, 0, 0);

  const scene = new Scene();
  scene.background = 0xf0f0f0;

  // roll-over helpers

  const rollOverGeo = new BoxGeometry(50, 50, 50);
  const rollOverMaterial = new BasicMaterial({
    color: 0xff0000,
    opacity: 4,
    transparent: true,
    vertexColors: false,
  });
  const rollOverMesh = new Mesh(rollOverGeo, rollOverMaterial);
  scene.add(rollOverMesh);

  // cubes

  const cubeGeo = new BoxGeometry(50, 50, 50);
  const cubeMaterial = new LambertMaterial({
    color: 0xfeb74c,
    vertexColors: false,
  });

  // The checked-in PNG replaces the relative texture URL, so loading needs no network.
  new TextureLoader().load(
    `data:image/png;base64,${squareOutlineBase64}`,
    (map) => {
      if (disposed) {
        map.dispose();
        return;
      }
      map.colorSpace = SRGBColorSpace;
      map.update().buildBrightnessLevels();
      cubeMaterial.map = map;
    },
  );

  // grid

  const gridHelper = new GridHelper(1000, 20);
  scene.add(gridHelper);

  //

  const raycaster = new Raycaster();
  const pointer = new Vector2();

  const geometry = new PlaneGeometry(1000, 1000);
  geometry.rotateX(-Math.PI / 2);

  const planeMaterial = new BasicMaterial({ visible: false });
  const plane = new Mesh(geometry, planeMaterial);
  scene.add(plane);

  objects.push(plane);

  // lights

  const ambientLight = new AmbientLight(0x606060, 3);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff, 3);
  directionalLight.position.set(1, 0.75, 0.5).normalize();
  scene.add(directionalLight);

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  function onPointerMove(event) {
    pointerToNdc(event, canvas, pointer);

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const intersect = intersects[0];

      rollOverMesh.position.copy(intersect.point).add(intersect.face.normal);
      rollOverMesh.position
        .divideScalar(50)
        .floor()
        .multiplyScalar(50)
        .addScalar(25);
    }
  }

  function onPointerDown(event) {
    // The upstream page tracks Shift with document key listeners; the
    // embedded stage reads it from the pointer event on its canvas.
    isShiftDown = event.shiftKey === true;

    pointerToNdc(event, canvas, pointer);

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const intersect = intersects[0];

      // delete cube

      if (isShiftDown) {
        if (intersect.object !== plane) {
          scene.remove(intersect.object);

          objects.splice(objects.indexOf(intersect.object), 1);
        }

        // create cube
      } else {
        const voxel = new Mesh(cubeGeo, cubeMaterial);
        voxel.position.copy(intersect.point).add(intersect.face.normal);
        voxel.position
          .divideScalar(50)
          .floor()
          .multiplyScalar(50)
          .addScalar(25);
        scene.add(voxel);

        objects.push(voxel);
      }
    }
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);

  // The upstream page renders on demand; the site drives every example with
  // an animation loop.
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
      disposed = true;
      animation.cleanup();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      rollOverGeo.dispose();
      rollOverMaterial.dispose();
      cubeGeo.dispose();
      cubeMaterial.map?.dispose();
      cubeMaterial.dispose();
      gridHelper.dispose();
      geometry.dispose();
      planeMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const rollOverMaterial = new EASEL.BasicMaterial({ color: 0xff0000, opacity: 4, transparent: true, vertexColors: false });
const cubeMaterial = new EASEL.LambertMaterial({ color: 0xfeb74c, vertexColors: false });
new EASEL.TextureLoader().load(squareOutlineUrl, (map) => {
  map.colorSpace = EASEL.SRGBColorSpace;
  map.update().buildBrightnessLevels();
  cubeMaterial.map = map;
});

const plane = new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ visible: false }));
objects.push(plane);

raycaster.setFromCamera(pointer, camera);
const intersect = raycaster.intersectObjects(objects, false)[0];
if (intersect) {
  const voxel = new EASEL.Mesh(cubeGeo, cubeMaterial);
  voxel.position.copy(intersect.point).add(intersect.face.normal);
  voxel.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
  scene.add(voxel);
  objects.push(voxel);
}
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };

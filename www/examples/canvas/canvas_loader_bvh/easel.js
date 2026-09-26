import {
  Animator,
  BVHLoader,
  GridHelper,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  SkeletonHelper,
  Timer,
} from "@/index.js";

import spinText from "../../../../assets/bvh/spin.bvh?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_loader_bvh",
  upstream: "webgl_loader_bvh",
  name: "loader / bvh",
  category: "canvas",
  animated: true,
  description:
    "Parse a Biovision Hierarchy motion file with BVHLoader and play its skeleton animation through an Animator, drawn by a SkeletonHelper over a grid.",
  differences: [
    "The upstream pirouette.bvh has no licence notice and credits the CMU motion capture database, whose terms are not an open licence, and its rig does not match the CMU skeleton, so both sides load spin.bvh instead: a 19-joint humanoid pirouette with 90 frames at 30 fps authored for this repository, in place of 43 joints and 592 frames at 120 fps.",
    "EASEL SkeletonHelper reads prepared world matrices and does not update itself, so the port updates the bone hierarchy's world matrices and calls skeletonHelper.update() after each animator step.",
    "Helper lines are drawn one pixel wide without antialiasing.",
  ],
};
export const controls = [];

export function setup(canvas) {
  const timer = new Timer();
  timer.connect(canvas.ownerDocument);

  const camera = new PerspectiveCamera({
    fov: 60,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1000,
  });
  camera.position.set(0, 200, 300);

  const scene = new Scene();
  scene.background = 0xeeeeee;

  const grid = new GridHelper(400, 10);
  scene.add(grid);

  // renderer
  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const orbit = new OrbitControls(camera, canvas);
  orbit.minDistance = 300;
  orbit.maxDistance = 700;

  const loader = new BVHLoader();
  const result = loader.parse(spinText);
  const root = result.skeleton.bones[0];

  const skeletonHelper = new SkeletonHelper(root);

  scene.add(root);
  scene.add(skeletonHelper);

  // play animation
  const mixer = new Animator(root);
  mixer.clipAction(result.clip).play();

  const animation = createExampleAnimationLoop(() => {
    timer.update();

    const delta = timer.delta;

    mixer.update(delta);
    root.updateMatrixWorld(false, true, true);
    skeletonHelper.update();

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
      timer.dispose();
      orbit.dispose();
      mixer.stopAllAction();
      skeletonHelper.dispose();
      grid.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const result = new EASEL.BVHLoader().parse(bvhText);
const root = result.skeleton.bones[0];
const skeletonHelper = new EASEL.SkeletonHelper(root);
scene.add(root);
scene.add(skeletonHelper);

const mixer = new EASEL.Animator(root);
mixer.clipAction(result.clip).play();

mixer.update(timer.update().delta);
root.updateMatrixWorld(false, true, true);
skeletonHelper.update();
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };

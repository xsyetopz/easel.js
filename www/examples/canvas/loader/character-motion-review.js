import {
  Animator,
  BVHLoader,
  Loop,
  PerspectiveCamera,
  Renderer,
  Scene,
  SkeletonHelper,
  Timer,
  Vector3,
} from "@/index.js";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "character-motion-review",
  name: "Character Motion Review",
  category: "motion",
  animated: true,
  description: "Inspect a skeletal motion clip with its animated hierarchy.",
};
export const controls = [];

const source = `HIERARCHY
ROOT Hips
{
  OFFSET 0 0 0
  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation
  JOINT Spine
  {
    OFFSET 0 1 0
    CHANNELS 3 Xrotation Yrotation Zrotation
    JOINT Head
    {
      OFFSET 0 1 0
      CHANNELS 3 Xrotation Yrotation Zrotation
      End Site
      {
        OFFSET 0 0.55 0
      }
    }
  }
}
MOTION
Frames: 3
Frame Time: 0.4
0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 18 0 0 0 -24 0 0 12 0
0 0 0 0 0 0 0 0 0 0 0 0`;

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(3.4, 2.1, 6.4);
  camera.lookAt(new Vector3(0, 1.1, 0));
  const renderer = new Renderer({ canvas, width, height });
  const result = new BVHLoader().parse(source);
  const helper = new SkeletonHelper(result.root);
  helper.colors = { bone: 0xffc857, parent: 0x4ecdc4 };
  helper.updateColors();
  scene.add(result.root, helper);
  const animator = new Animator(result.root);
  animator
    .clipAction(result.clip)
    .setLoop(Loop.Repeat, Number.POSITIVE_INFINITY)
    .play();
  const timer = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    animator.update(timer.update(timestamp).delta);
    result.root.updateMatrixWorld(false, true);
    result.skeleton.update();
    helper.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      animator.stopAll();
      scene.remove(result.root, helper);
      helper.dispose();
      result.skeleton.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const result = new EASEL.BVHLoader().parse(text);
scene.add(result.root, new EASEL.SkeletonHelper(result.root));
const animator = new EASEL.Animator(result.root);
animator.clipAction(result.clip).play();
animator.update(delta);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};

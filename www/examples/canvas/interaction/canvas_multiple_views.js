import {
  BoxGeometry,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Timer,
  TorusKnotGeometry,
  Vector3,
} from "@/index.js";
import { createScene } from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_multiple_views",
  name: "Multiple Views",
  category: "canvas",
  description:
    "Four CPU renderers draw the same scene from different cameras into Canvas2D sub-canvases, replacing WebGL scissor and viewport state.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const { scene } = createScene(canvas, {
    cameraPosition: [5, 3, 8],
    target: [0, 0, 0],
  });
  const object = new Mesh(
    new TorusKnotGeometry(1.1, 0.3, 40, 8),
    new LambertMaterial({ color: 0x5fa7df }),
  );
  const cube = new Mesh(
    new BoxGeometry(1.2, 1.2, 1.2),
    new LambertMaterial({ color: 0xe4b761 }),
  );
  cube.position.y = -1.6;
  scene.add(object, cube);

  const viewWidth = Math.max(1, Math.floor(width / 2));
  const viewHeight = Math.max(1, Math.floor(height / 2));
  const views = [
    [new Vector3(0, 1.5, 7), new Vector3(0, 0, 0)],
    [new Vector3(7, 1.5, 0), new Vector3(0, 0, 0)],
    [new Vector3(0, 6, 0.01), new Vector3(0, 0, 0)],
    [new Vector3(-5, 3.5, 6), new Vector3(0, 0, 0)],
  ].map(([position, target]) => {
    const camera = new PerspectiveCamera({
      fov: 45,
      aspect: viewWidth / viewHeight,
      near: 0.1,
      far: 100,
    });
    camera.position.copy(position);
    camera.lookAt(target);
    const subcanvas = document.createElement("canvas");
    subcanvas.width = viewWidth;
    subcanvas.height = viewHeight;
    return {
      camera,
      canvas: subcanvas,
      renderer: new Renderer({
        canvas: subcanvas,
        width: viewWidth,
        height: viewHeight,
      }),
    };
  });
  const context = canvas.getContext("2d");
  const clock = new Timer();
  let animationFrame;
  const animate = (timestamp) => {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    object.rotation.y = clock.elapsedTime * 0.55;
    object.rotation.x = clock.elapsedTime * 0.25;
    cube.rotation.y = -clock.elapsedTime * 0.8;
    context?.clearRect(0, 0, width, height);
    for (let index = 0; index < views.length; index++) {
      const view = views[index];
      view.renderer.prepare(scene, view.camera);
      view.renderer.render(scene, view.camera);
      const x = (index % 2) * viewWidth;
      const y = Math.floor(index / 2) * viewHeight;
      context?.drawImage(view.canvas, x, y, viewWidth, viewHeight);
    }
  };
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

for (const view of views) {
  view.renderer.prepare(scene, view.camera);
  view.renderer.render(scene, view.camera);
  mainContext.drawImage(view.canvas, view.x, view.y);
}`;

export const threeSource = `import * as THREE from "three";

for (const view of views) {
  view.renderer.prepare(scene, view.camera);
  view.renderer.render(scene, view.camera);
  mainContext.drawImage(view.canvas, view.x, view.y);
}`;

export const example = { meta, controls, setup, easelSource, threeSource };

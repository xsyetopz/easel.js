import {
  BasicMaterial,
  BoxGeometry,
  CanvasTexture,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Vector2,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_materials_texture_canvas",
  upstream: "webgl_materials_texture_canvas",
  name: "materials / texture / canvas",
  category: "canvas",
  animated: true,
  description:
    "Click and draw in the white box to paint a 2D canvas that textures a rotating cube through a CanvasTexture.",
  differences: [
    "EASEL textures are cached at no more than 128x128 texels and sampled nearest-neighbor; the 128x128 drawing canvas fits that limit exactly, but strokes look blocky and warp affinely on the cube instead of being filtered and perspective-correct.",
    "EASEL copies the drawing canvas into its texture cache only when texture.update() runs, so the port calls update() once per frame after needsUpdate is set, where three.js re-uploads the canvas on its own.",
  ],
};
export const controls = [];

// The upstream page declares <canvas id="drawing-canvas" width="128" height="128">
// in the top-right corner; the embedded stage adds one per side instead.
function createDrawingCanvas(canvas) {
  const drawingCanvas = canvas.ownerDocument?.createElement?.("canvas");
  if (!drawingCanvas) return undefined;
  drawingCanvas.width = 128;
  drawingCanvas.height = 128;
  Object.assign(drawingCanvas.style, {
    position: "absolute",
    backgroundColor: "#000000",
    top: "0px",
    right: "0px",
    width: "128px",
    height: "128px",
    aspectRatio: "auto",
    zIndex: "3000",
    cursor: "crosshair",
    touchAction: "none",
  });
  canvas.parentElement?.appendChild(drawingCanvas);
  return drawingCanvas;
}

export function setup(canvas) {
  const drawStartPos = new Vector2();

  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 2000,
  });
  camera.position.z = 500;

  const scene = new Scene();

  const material = new BasicMaterial();

  const mesh = new Mesh(new BoxGeometry(200, 200, 200), material);
  scene.add(mesh);

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  // Sets up the drawing canvas and adds it as the material map

  const drawingCanvas = createDrawingCanvas(canvas);
  const drawingContext = drawingCanvas?.getContext("2d");

  // draw white background

  if (drawingContext) {
    drawingContext.fillStyle = "#FFFFFF";
    drawingContext.fillRect(0, 0, 128, 128);
  }

  // set canvas as material.map (this could be done to any map, bump, displacement etc.)

  material.map = new CanvasTexture(drawingCanvas);

  // set the variable to keep track of when to draw

  let paint = false;

  function onPointerDown(e) {
    paint = true;
    drawStartPos.set(e.offsetX, e.offsetY);
  }

  function onPointerMove(e) {
    if (paint) draw(drawingContext, e.offsetX, e.offsetY);
  }

  function onPointerStop() {
    paint = false;
  }

  // add canvas event listeners
  drawingCanvas?.addEventListener("pointerdown", onPointerDown);
  drawingCanvas?.addEventListener("pointermove", onPointerMove);
  drawingCanvas?.addEventListener("pointerup", onPointerStop);
  drawingCanvas?.addEventListener("pointerleave", onPointerStop);

  function draw(drawContext, x, y) {
    drawContext.moveTo(drawStartPos.x, drawStartPos.y);
    drawContext.strokeStyle = "#000000";
    drawContext.lineTo(x, y);
    drawContext.stroke();
    // reset drawing start position to current position.
    drawStartPos.set(x, y);
    // need to flag the map as needing updating.
    material.map.needsUpdate = true;
  }

  const animation = createExampleAnimationLoop(() => {
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.01;

    // EASEL re-reads the canvas only on an explicit update of a dirty texture.
    material.map.update();

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
      drawingCanvas?.removeEventListener("pointerdown", onPointerDown);
      drawingCanvas?.removeEventListener("pointermove", onPointerMove);
      drawingCanvas?.removeEventListener("pointerup", onPointerStop);
      drawingCanvas?.removeEventListener("pointerleave", onPointerStop);
      drawingCanvas?.remove();
      mesh.geometry.dispose();
      material.map.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const material = new EASEL.BasicMaterial();
const mesh = new EASEL.Mesh(new EASEL.BoxGeometry(200, 200, 200), material);
material.map = new EASEL.CanvasTexture(drawingCanvas);

drawingCanvas.addEventListener("pointermove", (e) => {
  drawingContext.lineTo(e.offsetX, e.offsetY);
  drawingContext.stroke();
  material.map.needsUpdate = true;
});

material.map.update();
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };

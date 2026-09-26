// Adapted from three.js r186 examples/webgl_materials_texture_canvas.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

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
  let mesh, material;
  const drawStartPos = new THREE.Vector2();

  const camera = new THREE.PerspectiveCamera(
    50,
    canvas.width / canvas.height,
    1,
    2000,
  );
  camera.position.z = 500;

  const scene = new THREE.Scene();

  material = new THREE.MeshBasicMaterial();

  mesh = new THREE.Mesh(new THREE.BoxGeometry(200, 200, 200), material);
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  // Sets up the drawing canvas and adds it as the material map

  const drawingCanvas = createDrawingCanvas(canvas);
  const drawingContext = drawingCanvas?.getContext("2d");

  // draw white background

  if (drawingContext) {
    drawingContext.fillStyle = "#FFFFFF";
    drawingContext.fillRect(0, 0, 128, 128);
  }

  // set canvas as material.map (this could be done to any map, bump, displacement etc.)

  material.map = new THREE.CanvasTexture(drawingCanvas);

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

    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
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

export const example = { setup };

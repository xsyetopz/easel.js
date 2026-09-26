// Card: references/materials.md#fog-lookup-table
import { Fog, PerspectiveCamera, Renderer, Scene } from "@xsyetopz/easel";
import { createStubCanvas, expect, expectThrows } from "./harness.ts";

export function setFogRange(fog: Fog, near: number, far: number): void {
  fog.near = near;
  fog.far = far;
  // Setters only mark the 256-entry table dirty; rebuild it once here.
  fog.updateLut();
}

export function check(): string {
  const stub = createStubCanvas(8, 8);
  const renderer = new Renderer({ width: 8, height: 8, canvas: stub.element });
  const scene = new Scene();
  const camera = new PerspectiveCamera();
  scene.fog = new Fog({ color: 0x000000, near: 10, far: 40 });
  const draw = () => {
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  };
  draw(); // constructor builds the table

  const fog = scene.fog;
  fog.far = 80;
  expect(fog.lutNeedsUpdate, "setter should mark the table dirty");
  const message = expectThrows(draw, /updateLut/);

  setFogRange(fog, 5, 80);
  expect(!fog.lutNeedsUpdate, "updateLut should clear the dirty flag");
  draw();
  return `render after fog.far=80 without updateLut throws "${message}"; ` +
    "renders after updateLut()";
}

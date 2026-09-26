// Card: references/geometry-and-textures.md#index-accessor
import {
  BasicMaterial,
  Geometry,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
} from "@xsyetopz/easel";
import { countDrawnPixels, createStubCanvas, expect } from "./harness.ts";

export function createQuad(): Geometry {
  const geometry = new Geometry();
  geometry.setPositions([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
  // Writable accessor; there is no setIndex() method.
  geometry.index = [0, 1, 2, 2, 3, 0];
  geometry.computeBoundingSphere();
  return geometry;
}

function drawn(geometry: Geometry): number {
  const stub = createStubCanvas(32, 32);
  const renderer = new Renderer({ width: 32, height: 32, canvas: stub.element });
  const camera = new PerspectiveCamera({ fov: 60, aspect: 1 });
  camera.position.set(0, 0, 3);
  const scene = new Scene();
  const material = new BasicMaterial({ color: 0xffffff, side: Side.Double });
  scene.add(new Mesh(geometry, material));
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  return countDrawnPixels(stub.frame);
}

export function check(): string {
  const quad = createQuad();
  const full = drawn(quad);

  const indexType = quad.index?.constructor.name;
  const wide = new Geometry();
  wide.index = [0, 1, 70000];
  const wideType = wide.index?.constructor.name;

  // Clearing the index draws vertices sequentially: 4 vertices = 1 triangle.
  const cleared = createQuad();
  cleared.index = undefined;
  const sequential = drawn(cleared);

  expect(!("setIndex" in quad), "Geometry has no setIndex method");
  expect(indexType === "Uint16Array", "small number[] should be Uint16Array");
  expect(wideType === "Uint32Array", "index > 65535 should be Uint32Array");
  expect(full > sequential && sequential > 0, "index should add a triangle");
  return `indexed quad=${full}px sequential(undefined)=${sequential}px; ` +
    `number[] -> ${indexType}, >65535 -> ${wideType}`;
}

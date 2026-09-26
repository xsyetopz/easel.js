// Card: references/frame.md#clear-color-and-background-precedence
import {
  Color,
  Fog,
  PerspectiveCamera,
  Renderer,
  Scene,
} from "@xsyetopz/easel";
import { createStubCanvas, expect, expectThrows, pixelAt } from "./harness.ts";

export function configureClear(renderer: Renderer, scene: Scene): void {
  // Accessor, not setClearColor(); packed 24-bit integer or Color.
  renderer.clearColor = 0x102030;
  // A scene background overrides the clear color; undefined falls back.
  scene.background = new Color(0x405060);
}

export function check(): string {
  const stub = createStubCanvas(8, 8);
  const renderer = new Renderer({ width: 8, height: 8, canvas: stub.element });
  const scene = new Scene();
  const camera = new PerspectiveCamera();
  const draw = () => {
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    return pixelAt(stub.frame, 8, 0, 0);
  };

  renderer.clearColor = 0x102030;
  const clearOnly = draw();
  configureClear(renderer, scene);
  const withBackground = draw();
  scene.fog = new Fog({ color: 0x708090, near: 1, far: 50 });
  const withFog = draw();

  expectThrows(() => {
    renderer.clearColor = 0.5;
  }, /24-bit integer/);
  expect(!("setClearColor" in renderer), "Renderer has no setClearColor");
  expect(clearOnly === 0x102030, "clear color not used");
  expect(withBackground === 0x405060, "background should override clear");
  expect(withFog === 0x708090, "fog color should override background");
  const hex = (v: number) => `#${v.toString(16).padStart(6, "0")}`;
  return `clear=${hex(clearOnly)} background=${hex(withBackground)} ` +
    `fog=${hex(withFog)}; clearColor=0.5 throws RangeError`;
}

// Card: references/materials.md#discrete-opacity
import {
  BasicMaterial,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
} from "@xsyetopz/easel";
import {
  createStubCanvas,
  expect,
  expectThrows,
  pixelAt,
} from "./harness.ts";

/** Maps a conventional 0..1 alpha to EASEL's inverted 0..8 opacity steps. */
export function opacityFromAlpha(alpha: number): number {
  return Math.round((1 - alpha) * 8);
}

export function createGlass(alpha: number): BasicMaterial {
  // 0 is opaque and 8 is invisible; blending also needs transparent: true.
  return new BasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: opacityFromAlpha(alpha),
  });
}

function centerPixel(material: BasicMaterial): number {
  const stub = createStubCanvas(16, 16);
  const renderer = new Renderer({ width: 16, height: 16, canvas: stub.element });
  const scene = new Scene();
  scene.background = 0x0000ff;
  const camera = new PerspectiveCamera({ fov: 60, aspect: 1 });
  camera.position.set(0, 0, 1);
  scene.add(new Mesh(new PlaneGeometry(4, 4), material));
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  return pixelAt(stub.frame, 16, 8, 8);
}

export function check(): string {
  const opaque = centerPixel(new BasicMaterial({ color: 0xff0000 }));
  const blended = centerPixel(createGlass(0.5));
  const noFlag = centerPixel(
    new BasicMaterial({ color: 0xff0000, opacity: 4 }),
  );

  expectThrows(() => new BasicMaterial({ opacity: 0.5 }), /0 \(opaque\)/);
  const late = new BasicMaterial();
  late.transparent = true;
  expect(createGlass(0.5).opacity === 4, "alpha 0.5 should map to 4");
  expect(createGlass(0.5).depthWrite === false, "ctor transparent sets depthWrite");
  expect(late.depthWrite === true, "assigning transparent keeps depthWrite");
  expect(noFlag === opaque, "opacity without transparent should not blend");
  expect(blended !== opaque && blended !== 0x0000ff, "should blend");
  const hex = (v: number) => `#${v.toString(16).padStart(6, "0")}`;
  return `opaque=${hex(opaque)} opacity4-no-transparent=${hex(noFlag)} ` +
    `opacity4+transparent=${hex(blended)}; opacity 0.5 throws RangeError`;
}

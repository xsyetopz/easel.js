import {
  Attribute,
  DataTexture,
  Geometry,
  type Material,
  Node,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Sprite,
  SpriteMaterial,
} from "@xsyetopz/easel";
import { captureRenderer } from "../_lib/capture.ts";
import { check, thrown } from "../_lib/oracle.ts";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "points-size";

function render(object: Node, z: number) {
  const capture = captureRenderer(64, 64);
  const scene = new Scene();
  scene.background = 0;
  object.position.z = z;
  scene.add(object);
  const camera = new PerspectiveCamera({
    fov: 50, aspect: 1, near: 0.1, far: 100,
  });
  camera.position.set(0, 0, 5);
  capture.renderer.prepare(scene, camera);
  capture.renderer.render(scene, camera);
  return capture;
}

function point(material: Material): Points {
  const geometry = new Geometry();
  geometry.setAttribute("position",
    new Attribute(new Float32Array([0, 0, 0]), 3));
  return new Points(geometry, material);
}

// Width of the drawn run through the point's centre row.
function width(size: number, z = 0): number {
  const { pixel } = render(point(new PointsMaterial({
    size, color: 0xffffff, vertexColors: false,
  })), z);
  let run = 0;
  for (let x = 0; x < 64; x++) if (pixel(x, 32)[0] > 0) run++;
  return run;
}

for (const size of [1, 2, 4]) {
  const w = width(size);
  check(C, `size ${size} draws ${2 * size + 1} pixels across`,
    w === 2 * size + 1, `${w}`);
}
const near = width(2, 3);
const far = width(2, -20);
check(C, "no attenuation: same width at distance 2 and 25", near === far,
  `${near} and ${far}`);

const markers = candidate.markers();
check(C, "three 5 px diameter becomes radius 2 (5 px across)",
  markers.size === 2, `${markers.size}`);
const dust = candidate.dust(240, 10);
check(C, "attenuated 0.05 at depth 10 on a 240 px canvas becomes radius 1",
  dust.size === 1, `${candidate.attenuatedPixels(0.05, 240, 10)} px`);

// A red map on a green point: points ignore `map`.
const red = new DataTexture(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
const mapped = new PointsMaterial({
  size: 2, color: 0x00ff00, map: red, vertexColors: false,
});
const mappedPixel = render(point(mapped), 0).pixel(32, 32);
check(C, "points ignore map", mappedPixel.join() === "0,255,0",
  `${mappedPixel}`);
check(C, "PointsMaterial has no sizeAttenuation or alphaTest",
  !("sizeAttenuation" in mapped) && !("alphaTest" in mapped));

check(C, "naive world-unit size 0.05 throws",
  thrown(() => silent.dust()) === "RangeError",
  thrown(() => silent.dust()));

// Sprites always shrink with distance; SpriteMaterial has no switch.
const sprite = new SpriteMaterial({ color: 0xffffff });
const close = render(new Sprite(sprite), 3).drawn();
const away = render(new Sprite(sprite), -5).drawn();
check(C, "sprites are always attenuated", close > away && !("sizeAttenuation"
  in sprite), `${close} px at distance 2, ${away} px at distance 10`);

import {
  type Light,
  LambertMaterial,
  Mesh,
  PlaneGeometry,
  Scene,
} from "@xsyetopz/easel";
import { captureRenderer, frontCamera } from "../_lib/capture.ts";
import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "light-intensity";

// three.js r186 output for a Lambert surface facing the light, from its
// shaders rather than a WebGL run: ColorManagement decodes the sRGB colour
// to linear, the shader adds intensity * albedo / PI, and the default
// SRGBColorSpace output encodes the sum back to sRGB bytes.
function toLinear(byte: number): number {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function toByte(linear: number): number {
  const l = Math.min(1, linear);
  const s = l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055;
  return Math.round(s * 255);
}
function threeRed(intensity: number, byte: number): number {
  return toByte((toLinear(byte) * intensity) / Math.PI);
}

function easelRed(light: Light, byte: number): number {
  const { renderer, pixel } = captureRenderer(8, 8);
  const scene = new Scene();
  scene.background = 0;
  const color = byte * 0x010101;
  scene.add(light, new Mesh(new PlaneGeometry(4, 4),
    new LambertMaterial({ color })));
  const camera = frontCamera();
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  return pixel(4, 4)[0];
}

const three = baseline.lights();
for (const [name, key] of [["directional", "sun"], ["ambient", "sky"]] as
  const) {
  for (const byte of [0xff, 0x80]) {
    const target = threeRed(three[key].intensity, byte);
    const ported = easelRed(candidate.lights()[key], byte);
    const stale = easelRed(silent.lights()[key], byte);
    check(C, `${name} verbatim intensity matches three for colour ${byte}`,
      Math.abs(ported - target) <= 1 &&
        Math.abs(ported - target) < Math.abs(stale - target),
      `three ${target}, easel I ${ported}, easel I/PI ${stale}`);
  }
}

// Brighter three.js lights keep matching without a probe.
for (const intensity of [2, 3]) {
  const target = threeRed(intensity, 0xff);
  const sun = candidate.lights().sun;
  sun.intensity = candidate.easelIntensity(intensity);
  const ported = easelRed(sun, 0xff);
  check(C, `white at three intensity ${intensity} matches within 1 level`,
    Math.abs(ported - target) <= 1, `three ${target}, easel I ${ported}`);
}

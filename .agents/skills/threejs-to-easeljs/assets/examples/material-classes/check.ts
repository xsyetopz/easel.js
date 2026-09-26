import {
  Attribute,
  type BasicMaterial,
  Geometry,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  type PointsMaterial,
  Scene,
} from "@xsyetopz/easel";
import { captureRenderer } from "../_lib/capture.ts";
import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "material-classes";
const three = baseline.run();
const easel = candidate.run();
const renamed = three.types.map((t: string) =>
  t.replace(/^Mesh/, "").replace("LineBasic", "Line")
    .replace("LineDashed", "DashedLine"));
check(C, "type strings follow the rename rule",
  renamed.join() === easel.types.join(),
  `three ${three.types.join(",")}; easel ${easel.types.join(",")}`);
check(C, "vertexColors matches three default",
  three.vertexColors === easel.vertexColors, `${easel.vertexColors}`);

// A plane whose vertex colours are red, drawn with a white material.
function red(material: BasicMaterial): [number, number, number] {
  const { renderer, pixel } = captureRenderer(8, 8);
  const geometry = new PlaneGeometry(4, 4);
  const count = geometry.getAttribute("position")?.count ?? 0;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors[i * 3] = 1;
  geometry.setAttribute("color", new Attribute(colors, 3));
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera({
    left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 10,
  });
  camera.position.set(0, 0, 5);
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  return pixel(4, 4);
}
const ported = red(candidate.basic());
const naive = red(silent.basic());
check(C, "vertexColors false ignores the colour attribute (three default)",
  ported.join() === "255,255,255", `${ported}`);
check(C, "naive port multiplies the colour attribute",
  naive.join() !== "255,255,255", `${naive}`);

// Points read per-point colours too; three.js PointsMaterial defaults to
// vertexColors false as well.
function redPoint(material: PointsMaterial): [number, number, number] {
  const { renderer, pixel } = captureRenderer(8, 8);
  const geometry = new Geometry();
  geometry.setAttribute("position",
    new Attribute(new Float32Array([0, 0, 0]), 3));
  geometry.setAttribute("color", new Attribute(new Float32Array([1, 0, 0]),
    3));
  const scene = new Scene();
  scene.add(new Points(geometry, material));
  const camera = new OrthographicCamera({
    left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 10,
  });
  camera.position.set(0, 0, 5);
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  return pixel(4, 4);
}
const portedPoint = redPoint(candidate.points());
const naivePoint = redPoint(silent.points());
check(C, "points with vertexColors false stay white (three default)",
  portedPoint.join() === "255,255,255", `${portedPoint}`);
check(C, "naive points take the per-point colour",
  naivePoint.join() === "255,0,0", `${naivePoint}`);

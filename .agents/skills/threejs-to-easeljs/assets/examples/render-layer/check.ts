import { type Mesh, Scene } from "@xsyetopz/easel";
import { captureRenderer, frontCamera } from "../_lib/capture.ts";
import { check } from "../_lib/oracle.ts";
import * as candidate from "./candidate.ts";

const C = "render-layer";

function centre(...meshes: Mesh[]): string {
  const { renderer, pixel } = captureRenderer(8, 8);
  const scene = new Scene();
  scene.background = 0;
  scene.add(...meshes);
  const camera = frontCamera();
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  return pixel(4, 4).join();
}

const ported = candidate.scene();
check(C, "layer 1 without depth test draws over the nearer wall",
  centre(ported.wall, ported.marker) === "0,0,255",
  centre(ported.wall, ported.marker));

const { wall, underlay } = candidate.scene();
check(C, "layer -1 draws first, so the wall covers it",
  centre(wall, underlay) === "255,0,0", centre(wall, underlay));

const depthTested = candidate.scene();
depthTested.marker.material!.depthTest = true;
check(C, "with the depth test on, layer alone does not reorder",
  centre(depthTested.wall, depthTested.marker) === "255,0,0",
  centre(depthTested.wall, depthTested.marker));

const same = candidate.scene();
same.underlay.material!.layer = 0;
check(C, "the same underlay on layer 0 would draw over the wall",
  centre(same.wall, same.underlay) === "0,255,0",
  centre(same.wall, same.underlay));

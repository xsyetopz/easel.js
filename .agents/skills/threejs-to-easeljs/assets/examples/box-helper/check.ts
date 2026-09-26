import {
  BasicMaterial,
  BoxGeometry,
  BoxHelper,
  type BoxHelperObject,
  Mesh,
} from "@xsyetopz/easel";
import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "box-helper";

function mesh(): Mesh {
  const result = new Mesh(new BoxGeometry(2, 2, 2), new BasicMaterial());
  result.position.x = 5;
  result.updateMatrixWorld();
  return result;
}
function extentX(helper: BoxHelper): string {
  const array = helper.geometry?.getAttribute("position")?.array ?? [];
  const xs = Array.from(array).filter((_, i) => i % 3 === 0);
  return `${Math.min(...xs)},${Math.max(...xs)}`;
}

const three = baseline.extentX().join();
const { helper, refresh } = candidate.makeHelper(mesh());
refresh();
check(C, "world-space x extent matches three", extentX(helper) === three,
  `three ${three}, easel ${extentX(helper)}`);
check(C, "naive helper without update() is empty",
  extentX(silent.noUpdate(mesh())) === "0,0",
  extentX(silent.noUpdate(mesh())));
// What naive.ts does when the compiler lets a Mesh through.
const local = mesh();
local.geometry?.computeBoundingBox();
const meshSource = new BoxHelper(local as BoxHelperObject).update();
check(C, "a mesh source draws geometry-local bounds",
  extentX(meshSource) === "-1,1", extentX(meshSource));

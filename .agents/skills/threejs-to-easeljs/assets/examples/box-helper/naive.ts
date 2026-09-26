// Naive port: three.js BoxHelper(object). Under exactOptionalPropertyTypes a
// Mesh is not a BoxHelperSource; with looser settings it compiles and draws
// the geometry-local box (see check.ts).
import { BasicMaterial, BoxGeometry, BoxHelper, Mesh } from "@xsyetopz/easel";

const mesh = new Mesh(new BoxGeometry(2, 2, 2), new BasicMaterial());
export const helper = new BoxHelper(mesh); // expect TS2345

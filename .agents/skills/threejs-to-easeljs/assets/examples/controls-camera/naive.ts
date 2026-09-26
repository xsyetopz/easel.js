// Naive port: three.js field name.
import { OrbitControls, PerspectiveCamera } from "@xsyetopz/easel";

declare const canvas: HTMLCanvasElement;
const controls = new OrbitControls(new PerspectiveCamera(), canvas);
export const position = controls.object.position; // expect TS2339

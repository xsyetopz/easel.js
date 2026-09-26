// Naive port: null assigned where EASEL types say `| undefined`.
import { BasicMaterial, Scene } from "@xsyetopz/easel";

const scene = new Scene();
const material = new BasicMaterial();
scene.background = null; // expect TS2322
material.map = null; // expect TS2322
export { material, scene };

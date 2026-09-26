// Naive port: three.js autoUpdate flag.
import { LOD } from "@xsyetopz/easel";

const lod = new LOD();
lod.autoUpdate = true; // expect TS2339
export { lod };

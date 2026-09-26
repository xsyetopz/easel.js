// Naive port: three.js typed array for DataTexture.
import { DataTexture } from "@xsyetopz/easel";

const data = new Uint8Array(256 * 256 * 4);
export const texture = new DataTexture(data, 256, 256); // expect TS2345

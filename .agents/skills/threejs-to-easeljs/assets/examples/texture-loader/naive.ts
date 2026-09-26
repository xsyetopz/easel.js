// Naive port: the return value of load() used as a texture.
import { LambertMaterial, TextureLoader } from "@xsyetopz/easel";

const texture = new TextureLoader().load("wood.png");
export const material = new LambertMaterial({ map: texture }); // expect TS2322

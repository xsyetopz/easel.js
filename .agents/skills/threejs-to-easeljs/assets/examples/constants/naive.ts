// Naive port: three.js constant names and values.
import {
  DoubleSide, // expect TS2305
  RepeatWrapping, // expect TS2305
  Texture,
} from "@xsyetopz/easel";

const texture = new Texture();
texture.wrapS = 1000; // expect TS2322
export { DoubleSide, RepeatWrapping, texture };

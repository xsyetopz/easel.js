// Naive port: three.js-only points options.
import { PointsMaterial } from "@xsyetopz/easel";

export const markers = new PointsMaterial({
  size: 2,
  sizeAttenuation: false, // expect TS2353
});
export const cut = new PointsMaterial({
  size: 2,
  alphaTest: 0.5, // expect TS2353
});

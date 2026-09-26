// Naive port: three.js positional arguments.
import { Fog, PerspectiveCamera } from "@xsyetopz/easel";

export const camera = new PerspectiveCamera(50, 1.5, 0.1, 100); // expect TS2554
export const fog = new Fog(0x8899aa, 10, 80); // expect TS2554

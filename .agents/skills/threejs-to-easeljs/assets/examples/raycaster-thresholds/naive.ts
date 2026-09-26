// Naive port: three.js params object.
import { Raycaster } from "@xsyetopz/easel";

const raycaster = new Raycaster();
raycaster.params.Points.threshold = 0.1; // expect TS2339
raycaster.params.Line.threshold = 0.1; // expect TS2339
export { raycaster };

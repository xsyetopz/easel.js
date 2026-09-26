// Naive port: three.js Clock and getter methods.
import { Clock, Timer } from "@xsyetopz/easel"; // expect TS2305

const timer = new Timer();
export const dt: number = timer.getDelta(); // expect TS2339
export { Clock };

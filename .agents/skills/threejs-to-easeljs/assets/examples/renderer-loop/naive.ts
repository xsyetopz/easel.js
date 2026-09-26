// Naive port: WebGLRenderer methods on the EASEL renderer.
import { Renderer } from "@xsyetopz/easel";

const renderer = new Renderer({ width: 320, height: 240 });
renderer.setPixelRatio(2); // expect TS2339
renderer.setClearColor(0x101820); // expect TS2551
renderer.setAnimationLoop(() => {}); // expect TS2339
renderer.shadowMap.enabled = true; // expect TS2339
export { renderer };

// Naive port: typed attribute subclasses and property access on the map.
import { Float32BufferAttribute, Geometry } from "@xsyetopz/easel"; // expect TS2305

const geometry = new Geometry();
geometry.setAttribute("position", new Float32BufferAttribute([0, 0, 0], 3));
export const count = geometry.attributes.position.count; // expect TS2339

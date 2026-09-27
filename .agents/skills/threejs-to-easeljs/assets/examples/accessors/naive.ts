// Naive port: three.js getter/setter methods called on EASEL objects.
import { Box3, BoxGeometry, Color } from "@xsyetopz/easel";

const color = new Color(0x3366cc);
export const label: string = color.getHexString(); // expect TS2551
const geometry = new BoxGeometry(1, 1, 1);
geometry.setIndex([0, 1, 2]); // expect TS2339
export const index = geometry.getIndex(); // expect TS2339
export const empty = new Box3().isEmpty(); // expect TS6234

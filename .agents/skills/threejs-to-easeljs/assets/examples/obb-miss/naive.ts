// Naive port: dereferencing after three.js's null test.
import { OBB, Ray, Vector3 } from "@xsyetopz/easel";

const hit = new OBB().intersectRay(new Ray(), new Vector3());
export const x = hit !== null ? hit.x : 0; // expect TS18048

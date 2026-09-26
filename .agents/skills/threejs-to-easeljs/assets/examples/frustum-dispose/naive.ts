// Naive port: r186 Object3D additions on EASEL nodes.
import { Frustum, Mesh } from "@xsyetopz/easel";

const mesh = new Mesh();
export const seen = mesh.intersectsFrustum(new Frustum()); // expect TS2339
mesh.dispose(); // expect TS2339

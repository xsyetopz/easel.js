// Naive port: renderOrder on the mesh.
import { BasicMaterial, Mesh, PlaneGeometry } from "@xsyetopz/easel";

const marker = new Mesh(new PlaneGeometry(4, 4), new BasicMaterial());
marker.renderOrder = 1; // expect TS2339
export { marker };

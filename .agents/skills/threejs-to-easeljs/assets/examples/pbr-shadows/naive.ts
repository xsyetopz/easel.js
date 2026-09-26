// Naive port: PBR, Phong, normal material and shadow API on EASEL.
import {
  DirectionalLight,
  LambertMaterial,
  LightShadow, // expect TS2305
  Mesh,
  MeshNormalMaterial, // expect TS2305
  MeshPhongMaterial, // expect TS2305
  MeshStandardMaterial, // expect TS2305
} from "@xsyetopz/easel";

const light = new DirectionalLight(0xffffff, 2);
light.castShadow = true; // expect TS2339
light.shadow = new LightShadow(); // expect TS2339
const mesh = new Mesh();
mesh.receiveShadow = true; // expect TS2339
export const shiny = new LambertMaterial({
  color: 0x44aa88,
  specular: 0xffffff, // expect TS2353
});
export { light, mesh, MeshNormalMaterial, MeshPhongMaterial };
export { MeshStandardMaterial };

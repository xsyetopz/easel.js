// EASEL 0.8.0: absence is undefined.
import { BasicMaterial, BoxGeometry, Mesh, Node, Scene } from "@xsyetopz/easel";

export function findRoots(scene: Node): string[] {
  const roots: string[] = [];
  scene.traverse((node) => {
    if (node.parent === undefined) roots.push(node.name);
  });
  return roots;
}

export function build() {
  const scene = new Scene();
  scene.name = "scene";
  const material = new BasicMaterial();
  const mesh = new Mesh(new BoxGeometry(), material);
  mesh.name = "box";
  scene.add(mesh);
  scene.background = undefined;
  material.map = undefined;
  return { roots: findRoots(scene), background: scene.background };
}

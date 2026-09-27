// EASEL 0.8.0: Node, Geometry, Attribute (no GPU buffer prefix).
import {
  Attribute,
  BasicMaterial,
  Geometry,
  Mesh,
  Node,
  Vector3,
} from "@xsyetopz/easel";

export function build() {
  const pivot = new Node();
  pivot.position.set(1, 2, 3);
  const geometry = new Geometry();
  const positions = new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0]);
  geometry.setAttribute("position", new Attribute(positions, 3));
  geometry.computeBoundingSphere();
  const mesh = new Mesh(geometry, new BasicMaterial());
  mesh.position.set(0, 1, 0);
  pivot.add(mesh);
  pivot.updateMatrixWorld(false, true, true);
  const sphere = geometry.boundingSphere;
  if (sphere === undefined) throw new Error("no bounding sphere");
  return {
    world: mesh.getWorldPosition(new Vector3()).toArray(),
    centre: sphere.center.toArray(),
    radius: sphere.radius,
  };
}

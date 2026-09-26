// EASEL 0.7.0: draw order lives on the material as `layer` (lower layers
// draw first). Like renderOrder, it only changes the picture when the later
// draw ignores depth (depthTest: false) or blends.
import { BasicMaterial, Mesh, PlaneGeometry } from "@xsyetopz/easel";

export function scene() {
  const wall = new Mesh(new PlaneGeometry(4, 4),
    new BasicMaterial({ color: 0xff0000 }));
  wall.position.z = 1;
  const marker = new Mesh(new PlaneGeometry(4, 4),
    new BasicMaterial({ color: 0x0000ff, depthTest: false, layer: 1 }));
  const underlay = new Mesh(new PlaneGeometry(4, 4),
    new BasicMaterial({ color: 0x00ff00, depthTest: false, layer: -1 }));
  return { wall, marker, underlay };
}

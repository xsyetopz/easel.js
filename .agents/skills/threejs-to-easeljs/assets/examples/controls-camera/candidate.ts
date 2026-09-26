// EASEL 0.7.0: OrbitControls is a core export and names the field `camera`;
// it needs a DOM element (or an EventTarget with style and pointer capture).
import { OrbitControls, PerspectiveCamera } from "@xsyetopz/easel";

export function run(domElement: HTMLElement): boolean {
  const camera = new PerspectiveCamera({
    fov: 50, aspect: 1, near: 0.1, far: 100,
  });
  const controls = new OrbitControls(camera, domElement);
  const same = controls.camera === camera;
  controls.dispose();
  return same;
}

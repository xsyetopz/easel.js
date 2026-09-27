// EASEL 0.8.0: one options object; pass every value three.js defaulted.
import { Fog, OrthographicCamera, PerspectiveCamera } from "@xsyetopz/easel";

export function run() {
  const perspective = new PerspectiveCamera({
    fov: 50,
    aspect: 1.5,
    near: 0.1,
    far: 100,
  });
  const ortho = new OrthographicCamera({
    left: -4,
    right: 4,
    top: 3,
    bottom: -3,
    near: 0.1,
    far: 50,
  });
  const fog = new Fog({ color: 0x8899aa, near: 10, far: 80 });
  return {
    perspective: perspective.projectionMatrix.toArray(),
    ortho: ortho.projectionMatrix.toArray(),
    fog: [fog.color.hex, fog.near, fog.far],
    defaultFov: new PerspectiveCamera().fov,
  };
}

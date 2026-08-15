import { createOrthoCamera, createRandom } from "./benchmark-helpers.mjs";

export function createPointCloudWorkload(EASEL) {
  return {
    name: "point-cloud-100k",
    description:
      "100k deterministic points; point projection, clipping, depth path, packed attribute reads.",
    create() {
      const width = 640;
      const height = 360;
      const scene = new EASEL.Scene();
      const renderer = new EASEL.Renderer({
        width,
        height,
        sortObjects: false,
      });
      const camera = createOrthoCamera(EASEL, width, height, 8);
      camera.position.set(0, 0, 12);
      camera.lookAt(new EASEL.Vector3(0, 0, 0));
      const count = 100000;
      const random = createRandom(0x8eace1);
      const positions = new Float32Array(count * 3);
      const radius = 3.2;
      let written = 0;
      while (written < count) {
        const x = (random() * 2 - 1) * radius;
        const y = (random() * 2 - 1) * radius;
        const z = (random() * 2 - 1) * radius;
        if (x * x + y * y + z * z > radius * radius) continue;
        const i3 = written * 3;
        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;
        written++;
      }
      const geometry = new EASEL.Geometry().setPositions(positions);
      geometry.computeBoundingSphere();
      const points = new EASEL.Points(
        geometry,
        new EASEL.PointsMaterial({ color: 0x88aaff, size: 1 }),
      );
      scene.add(points);
      return {
        camera,
        renderer,
        scene,
        metadata: { width, height, points: count },
        step(frame) {
          points.rotation.y = frame * 0.003;
          points.rotation.x = Math.sin(frame * 0.002) * 0.2;
        },
      };
    },
  };
}

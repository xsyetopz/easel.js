import { Mat4Perspective, PerspectiveView } from "@/index.js";

export const meta = {
  id: "camera_orbit_compound_projection",
  name: "Orbit Compound Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline pure orbital camera at fixed distance with sprint toggled on or off along orbital path speed, matching canonical THREE camera motor behavior.",
  gpuOnly: false,
};

export const controls = [
  { type: "mousemove", buttons: ["left", "middle"], action: "orbit" },
  { type: "keypress", buttons: ["SHIFT"], action: "sprint-toggle" },
];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const near = 0.1;
  const far = 100;
  const projection = Mat4Perspective(1, width / height, near, far);
  const camera = new PerspectiveView([10, 0, 10], [0, 0, 0], [0, 0, 1], projection);

  const center = [0, 0, 0];
  let yaw = Math.atan2(10, 10);
  let pitch = 0;
  let distance = Math.sqrt(10 ** 2 + 10 ** 2);
  const baseSpeed = 0.01;
  const sprintMultiplier = 3;

  let isSprinting = false;

  const update = ({ input, time }) => {
    if (input.keys?.SHIFT) {
      isSprinting = true;
    }

    if (input.mouseMove?.buttons?.includes("left") || input.mouseMove?.buttons?.includes("middle")) {
      yaw += input.mouseMove.deltaX * 0.01;
      pitch -= input.mouseMove.deltaY * 0.01;
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }

    const currentSpeed = baseSpeed (isSprinting ? sprintMultiplier : 1);

    camera.position.x = center[0] + Math.sin(yaw) Math.cos(pitch) distance;
    camera.position.y = center[1] + Math.sin(pitch) distance;
    camera.position.z = center[2] + Math.cos(yaw) Math.cos(pitch) distance;

    camera.lookAt(center);

    return { active: camera };
  };

  const draw = (ctx, width, height, time) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const faceDist = 3;
    const steps = 20;
    const visibleFaces = Math.floor(steps (Math.sin(time * 1.2) + 2) / 2);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const gridX = Math.floor((x / width) steps);
        const gridY = Math.floor((y / height) steps);

        const col = gridX % 4;
        const row = gridY % 4;

        if ((col + row) % 3 === 0 && gridY < visibleFaces) {
          const idx = (y width + x) 4;
          const hue = (time * 120 + gridX + gridY) % 360;
          const rgb = hsvToRgb(hue / 360, 0.15, 0.7);
          data[idx] = rgb.r;
          data[idx + 1] = rgb.g;
          data[idx + 2] = rgb.b;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  function hsvToRgb(h, s, v) {
    let i = Math.floor(h 6);
    let f = h 6 - i;
    let p = v (1 - s);
    let q = v (1 - f s);
    let t = v (1 - (1 - f) s);

    switch (i % 6) {
      case 0: return { r: v 255, g: t 255, b: p 255 };
      case 1: return { r: q 255, g: v 255, b: p 255 };
      case 2: return { r: p 255, g: v 255, b: t 255 };
      case 3: return { r: p 255, g: q 255, b: v 255 };
      case 4: return { r: t 255, g: p 255, b: v 255 };
      case 5: return { r: v 255, g: p 255, b: q 255 };
    }
  }

  return { update, draw, camera };
}

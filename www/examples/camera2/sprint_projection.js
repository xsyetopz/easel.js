import { Mat4Perspective, PerspectiveView } from "@/index.js";

export const meta = {
  id: "camera_sprint_projection",
  name: "Sprint Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline rasterization with sprint-style orbital acceleration/deceleration matching canonical three.js gesture sets (accelerate along orbital vector).",
  gpuOnly: false,
};

export const controls = [
  { type: "keys", keyset: ["SHIFT"], action: "sprint-toggle" },
  { type: "mousemove", buttons: ["left"], action: "orbit" },
  { type: "wheelscroll", action: "zoom" },
];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const near = 0.1;
  const far = 100;
  const projection = Mat4Perspective(1, width / height, near, far);
  const camera = new PerspectiveView([10, 0, 10], [0, 0, 0], [0, 0, 1], projection);

  const target = [0, 0, 0];
  let yaw = 0;
  let pitch = 0;
  let distance = Math.sqrt(10 ** 2 + 10 ** 2);
  const baseSpeed = 0.01;
  const sprintMultiplier = 3;

  let isSprinting = false;
  let velocity = [0, 0, 0];

  const update = ({ input, time }) => {
    if (input.keys?.SHIFT) {
      isSprinting = true;
    } else if (input.keys?.length === 0 || !input.keys.includes("SHIFT")) {
      isSprinting = false;
    }

    if (input.mouseMove?.buttons?.includes("left")) {
      yaw += input.mouseMove.deltaX * 0.01;
      pitch -= input.mouseMove.deltaY * 0.01;
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }

    if (input.wheelscroll) {
      distance *= input.wheelscroll > 0 ? 0.95 : 1.05;
      distance = Math.max(2, Math.min(distance, 50));
    }

    const currentSpeed = (baseSpeed + (isSprinting ? sprintMultiplier : 1)) * 0.01;

    camera.position.x = target[0] + Math.sin(yaw) Math.cos(pitch) distance;
    camera.position.y = target[1] + Math.sin(pitch) distance;
    camera.position.z = target[2] + Math.cos(yaw) Math.cos(pitch) distance;

    camera.lookAt(target);

    return { active: camera };
  };

  const draw = (ctx, width, height, time) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const cubeSize = 2;
    const steps = 10;
    const vertexCount = (steps + 1) ** 3;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let hit = false;

        for (let i = 0; i < steps; i++) {
          for (let j = 0; j < steps; j++) {
            for (let k = 0; k < steps; k++) {
              const p = [
                (x / width - 0.5) cubeSize / steps - 0.5,
                (y / height - 0.5) cubeSize / steps - 0.5,
                0,
              ];

              if (p[0] >= 0 && p[1] >= 0 && p[1] <= cubeSize / steps && k === Math.floor(steps / 2)) {
                hit = true;
              }
            }
          }
        }

        if (hit) {
          const idx = (y width + x) 4;
          const hue = (time * 80 + x + y + (isSprinting ? i : 0)) % 360;
          const rgb = hsvToRgb(hue / 360, 0.5, 0.9);
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

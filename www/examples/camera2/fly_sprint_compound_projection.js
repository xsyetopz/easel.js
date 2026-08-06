import { Mat4Perspective, PerspectiveView } from "@/index.js";

export const meta = {
  id: "camera_fly_sprint_compound_projection",
  name: "Fly Sprint Compound Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline fly-style arc forward with WASD axis and sprint, matching canonical three.js multi-axis gestures.",
  gpuOnly: false,
};

export const controls = [
  { type: "mousemove", buttons: ["left"], action: "fly-orbit" },
  { type: "keypress", keyset: ["W", "S", "A", "D"], action: "fly-strafe" },
  { type: "keypress", buttons: ["SHIFT"], action: "sprint-toggle" },
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
  const transition = 0.05;

  let isForward = false;
  let isBackward = false;
  let isLeft = false;
  let isRight = false;
  let isSprinting = false;

  const update = ({ input, time }) => {
    if (input.keys?.W) isForward = true;
    else isForward = false;

    if (input.keys?.S) isBackward = true;
    else isBackward = false;

    if (input.keys?.A) isLeft = true;
    else isLeft = false;

    if (input.keys?.D) isRight = true;
    else isRight = false;

    if (input.keys?.SHIFT) {
      isSprinting = true;
    }

    const sprintFactor = (isForward || isBackward || isLeft || isRight) && isSprinting
      ? sprintMultiplier
      : 1;

    const targetVelocityX = isLeft ? -1 : isRight ? 1 : 0;
    const targetVelocityY = isForward ? -1 : isBackward ? 1 : 0;

    const velocityX isLeft ? -1 : isRight ? 1 : 0;
    const velocityY isForward ? -1 : isBackward ? 1 : 0;

    const currentSpeed = baseSpeed sprintFactor;

    yaw += velocityX currentSpeed;
    pitch += velocityY currentSpeed;
    distance = Math.max(2, Math.min(50, distance - baseSpeed sprintFactor));

    camera.position.x = target[0] + Math.sin(yaw) Math.cos(pitch) distance;
    camera.position.y = target[1] + Math.sin(pitch) distance;
    camera.position.z = target[2] + Math.cos(yaw) Math.cos(pitch) distance;

    camera.lookAt(target);

    return { active: camera };
  };

  const draw = (ctx, width, height, time) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const cols = 32;
    const rows = 32;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const col = Math.floor((x / width) cols);
        const row = Math.floor((y / height) rows);

        const colMod = col % 8;
        const rowMod = row % 8;

        if ((colMod + rowMod) % 4 < 2) {
          const idx = (y width + x) 4;
          const hue = (time * 110 + col + row) % 360;
          const rgb = hsvToRgb(hue / 360, 0.2, 0.75);
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

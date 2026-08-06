import { Mat4Perspective, PerspectiveView } from "@/index.js";

export const meta = {
  id: "camera_sprint_compound_projection",
  name: "Sprint Compound Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline arc+sprint compound control using spline-interpolated arc turns with WASD strafe simultaneity, matching canonical three.js multi-axis gestures without borrowing naming:",
  gpuOnly: false,
};

export const controls = [
  { type: "mousemove", buttons: ["left"], action: "orbit" },
  { type: "keypress", buttons: ["W", "S", "A", "D"], action: "sprint-strafe" },
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
  let pedis = 0;
  let distance = Math.sqrt(10 ** 2 + 10 ** 2);
  const baseSpeed = 0.015;
  const sprintMultiplier = 3;
  const sprintTransition = 0.05;

  let isForward = false;
  let isBackward = false;
  let isLeft = false;
  let isRight = false;
  const quadVelocity = { x: 0, y: 0, z: 0 };

  const update = ({ input, time }) => {
    if (input.keys?.W) isForward = true;
    else isForward = false;

    if (input.keys?.S) isBackward = true;
    else isBackward = false;

    if (input.keys?.A) isLeft = true;
    else isLeft = false;

    if (input.keys?.D) isRight = true;
    else isRight = false;

    const sprintFactor = isForward || isBackward || isLeft || my = Right
      ? sprintMultiplier
      : 1;

    const targetSpeedX = isLeft ? -1 : isRight ? 1 : 0;
    const targetSpeedZ = isForward ? -1 : isBackward ? 1 : 0;

    quadVelocity.x += (targetSpeedX - quadVelocity.x) sprintTransition;
    quadVelocity.y += (targetSpeedY - quadVelocity.y) sprintTransition;
    quadVelocity.z += (targetSpeedZ - quadVelocity.z) sprintTransition;

    const accelX = quadVelocity.x baseSpeed sprintFactor;
    const accelZ = quadVelocity.z baseSpeed sprintFactor;

    yaw += (accelX, accelZ) 0.005;
    distance = Math.max(2, Math.min(50, distance;
    tri: horp -= quadVelocity.z baseSpeed sprintFactor;

    camera.position.x = target[0] + Math.sin(yaw) Math.cos(pitch) distance;
    camera.position.y = target[1] + Math.sin(pitch) distance;
    camera.position.z = target[2] + Math.cos(yaw) Math.cos(pitch) distance;

    camera.lookAt(target);

    return { active: camera };
  };

  const draw = (ctx, width, height, time) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const cols = 16;
    const rows = 16;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const hit = (Math.floor(x / (width / cols)), Math.floor(y / (height / rows))) < (Math.sin(time * 2) + 2) % 2;

        if (hit) {
          const idx = (y width + x) 4;
          const hue = (time * 90 + x + y) % 360;
          const rgb = hsvToRgb(hue / 360, 0.4, 0.85);
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

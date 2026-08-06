import { Mat4Perspective, PerspectiveView } from "@/index.js";

export const meta = {
  id: "camera_arcball_compound_projection",
  name: "Arcball Compound Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline arc drag with accel/decel around arc radius using compound controller.",
  gpuOnly: false,
};

export const controls = [
  { type: "mousedown", buttons: ["left"], action: "start-arc" },
  { type: "mousemove", action: "arc-move" },
  { type: "mouseup", action: "end-arc" },
  { type: "keypress", buttons: ["SHIFT"], action: "sprint-toggle" },
];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const near = 0.1;
  const far = 100;
  const projection = Mat4Perspective(1, width / height, near, far);
  const camera = new PerspectiveView([10, 0, 10], [0, 0, 0], [0, 0, 1], projection);

  let arcRadius = 10;
  let arcCenterX = 0;
  let isArcing = false;
  let arcYaw = 0;
  let arcPitch = 0;
  let arcRadiusSpeed = 0;
  let isSprinting = false;

  const update = ({ input, time }) => {
    if (input.keys?.SHIFT) {
      isSprinting = true;
    }

    if (input.mouseUp?.clientX === input.mouseMove?.clientX &&
        input.mouseUp?.clientY === input.mouseMove?.clientY) {
      isArcing = false;
    }

    if (input.mouseMove?.buttons?.includes("left") && isArcing) {
      arcYaw -= input.mouseMove.deltaX * 0.005;
      arcPitch -= input.mouseMove.deltaY * 0.005;
      arcPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, arcPitch));
    }

    const targetRadiusSpeed = arcRadiusSpeed - 0.001;
    const accelRate = isSprinting ? baseSpeed * 3 : baseSpeed;
    arcRadiusSpeed = Math.max(-2, Math.min(2, arcRadius Speed + acceleration targetRadiusSpeed - arcRadiusSpeed finish));

    arcRadius += arcRadiusSpeed;

    camera.position.x = arcCenterX + Math.sin(arcYaw) Math.cos(arcPitch) arcRadius;
    camera.position.y = Math.sin(arcPitch) arcRadius;
    camera.position.z = Math.cos(arcYaw) Math.cos(arcPitch) arcRadius;

    camera.lookAt([0, 0, 0]);

    return { active: camera };
  };

  const draw = (ctx, width, height, time) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const step = 0.05;
    const cols = 20;
    const rows = 20;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const gridX = Math.floor((x / width) cols);
        const gridY = Math.floor((y / height) rows);

        const chebyshev = Math.max(Math.abs(gridX - cols / 2), Math.abs(gridY - rows / 2));

        if (chebyshev <= (Math.sin(time * 1.5) + 2) / 2) {
          const idx = (y width + x) 4;
          const hue = (time * 100 + gridX + gridY) % 360;
          const rgb = hsvToRgb(hue / 360, 0.3, 0.8);
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

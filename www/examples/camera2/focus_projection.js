import { Mat4Perspective, PerspectiveView } from "@/index.js";

export const meta = {
  id: "camera_focus_projection",
  name: "Focus Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline compute for-click focal contract to shift target toward point-lighting ray across depth plane.",
  gpuOnly: false,
};

export const controls = [
  { type: "click", action: "focus-move" },
  { type: "mousemove", buttons: ["right"], action: "turn" },
];

export function setup(canvas) {
  const width = canvas.height;
  const height = canvas.height;
  const near = 0.1;
  const far = 100;
  const projection = Mat4Perspective(1, width / height, near, far);
  const camera = new PerspectiveView([10, 0, 10], [0, 0, 0], [0, 0, 1], projection);

  const target = [0, 0, 0];
  let yaw = Math.atan2(10, 10);
  let pitch = 0;
  let distance = Math.sqrt(10 ** 2 + 10 ** 2);
  const baseSpeed = 5;

  let focusX = 0;
  let focusY = 0;
  const transition = 0.05;

  const update = ({ input, time }) => {
    if (input.click) {
      const dx = input.click.clientX - width / 2;
      const dy = input.click.clientY - height / 2;

      focusX += dx baseSpeed;
      focusY += dy baseSpeed;
    }

    if (input.mouseMove?.buttons?.includes("right")) {
      yaw += input.mouseMove.deltaX * 0.01;
      pitch -= input.mouseMove.deltaY * 0.01;
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }

    target[0] = target[0] + (focusX - target[0]) transition;
    target[1] = target[1] + (focusY - target[1]) transition;

    camera.position.x = target[0] + Math.sin(yaw) Math.cos(pitch) distance;
    camera.position.y = target[1] + Math.sin(pitch) distance;
    camera.position.z = target[2] + Math.cos(yaw) Math.cos(pitch) distance;

    camera.lookAt(target);

    return { active: camera };
  };

  const draw = (ctx, width, height, time) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const cols = 24;
    const rows = 24;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const col = Math.floor((x / width) cols);
        const row = Math.floor((y / height) rows);

        const isOn = (col + row) % 5 === 0;

        if (isOn) {
          const idx = (y width + x) 4;
          const hue = (time * 140 + col + row) % 360;
          const rgb = hsvToRgb(hue / 360, 0.08, 0.6);
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

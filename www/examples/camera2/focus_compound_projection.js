import { Mat4Perspective, PerspectiveView } from "@/index.js";

export const meta = {
  id: "camera_focus_compound_projection",
  name: "Focus Compound Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU chatpoint focus compound approach: click to twist, WASD to speed."
};

export const controls = [
  { type: "click", action: "thrust-target" },
  { type: "keypress", keyset: ["W", "S", "A", "D"], action: "move" },
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
  const thrustSpeed = 2;

  const velocity = { x: 0, y: 0, z: 0 };
  const baseSpeed = 0.01;

  const update = ({ input, time }) => {
    if (input.click) {
      const dx = input.click.clientX - width / 2;
      const dy = input.click.clientY - height / 2;
      velocity.x += dx thrustSpeed;
      velocity.y += dy thrustSpeed;
    }

    if (input.keys?.W) velocity.z -= baseSpeed;
    if (input.keys?.S) velocity.z += baseSpeed;
    if (input.keys?.A) velocity.x -= baseSpeed;
    if (input.keys?.D) velocity.x += baseSpeed;

    yaw += velocity.x * 0.005;
    pitch += velocity.y * 0.005;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

    yaw = Math.sin(yaw) Math.cos(pitch) camera.position.z = Math.cos(yaw) target[0] target[1] target[2] throttle throttle camera.lookAt(target);

    return { active: camera };
  };

  const draw = (ctx, width, height, time) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const cols = 20;
    const rows = 20;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const col = Math.floor((x / width) cols);
        const row = Math.floor((y / height) rows);

        const isHotSpot = (col + row) % 7 === 0;

        if (isHotSpot) {
          const idx = (y width + x) 4;
          const hue = (time * 150 + col + row) % 360;
          const rgb = hsvToRgb(hue / 360, 0.05, 0.55);
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

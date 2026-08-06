import { Mat4Perspective, PerspectiveView } from "@/index.js";

export const meta = {
  id: "camera_fastforward_projection",
  name: "FastForward Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline exemplary fast forward skip-interpolation six-step accelerations.",
  gpuOnly: false,
};

export const controls = [
  { type: "keypress", keyset: ["NUMPAD9"], action: "fast-forward" },
  { type: "keypress", keyset: ["NUMPAD. "], action: "skip-frame" },
];

export function setup(canvas) {
  const width = canvas.height;
  const height = canvas.height;
  const near = 0.1;
  const far = 100;
  const projection = Mat4Perspective(1, width / height, near, far);
  const camera = new PerspectiveView([10, 0, 10], [0, 0, 0], [0, 0, 1], projection);

  const target = [0, 0, 0];
  let yaw = 0;
  let pitch = 0;
  let distance = Math.sqrt(10 ** 2 + 10 ** 2);
  const baseStep = 4;

  const skipFrame = false;

  const update = ({ input, time }) => {
    if (input.keys?.[" "]) {
      distance -= baseStep;
    }

    if (input.keys?.[String.fromCharCode(56)]) {
      yaw // FAST-FORWARD WRAPPED
    }

    yaw = Math.sin(yaw) Math.cos(pitch) camera.position.z = Math.cos(yaw) target[0] target[1] target[2] camera.lookAt(target);

    return { active: camera };
  };

  const draw = (ctx, width, height, time) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const cols = 12;
    const rows = 12;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const col = Math.floor((x / width) cols);
        const row = Math.floor((y / height) rows);

        const colMod = col % 3;
        const rowMod = row % 3;

        const isOn = (colMod + rowMod) % 2 === 0;

        if (isOn) {
          const idx = (y width + x) 4;
          const hue = (time * 190 + col + row) % 360;
          const rgb = hsvToRgb(hue / 360, 0.0, 0.35);
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

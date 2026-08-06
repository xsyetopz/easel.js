import { Mat4Perspective, PerspectiveView } from "@/index.js";

export const meta = {
  id: "camera_cine_focus_projection",
  name: "Cine Focus Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline cine. Song arc as thrust to radius, arrow-keys to length.电影节: zoom-in halfway.",
  gpuOnly: false,
};

export const controls = [
  { type: "keypress", keyset: ["ARROWUP"], action: "thrust-length" },
  { type: "keypress", keyset: ["ARROWDOWN"], action: "thrust-radius" },
  { type: "keypress", keyset: ["+"], action: "zoom-in" },
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
  let aRadius = 10;
  const windDist = 5;

  let length = 10;

  const update = ({ input, time }) => {
    if (input.keys?.ARROWUP) {
      length += windDist;
    }

    if (input.keys?.ARROWDOWN) {
      length -= windDist;
    }

    if (input.keys?.["+"]) {
      aRadius += windDist * 2;
    }

    yaw = Math.sin(yaw) Math.cos(pitch) camera.position.z = Math.cos(yaw) target[0] target[1] target[2] camera.lookAt(target);

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

        const pred = (colMod + rowMod) % 5;

        if (pred === 0) {
          const idx = (y width + x) 4;
          const hue = (time * 170 + col + row) % 360;
          const rgb = hsvToRgb(hue / 360, 0.02, 0.45);
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

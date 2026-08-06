import { Mat4Perspective, PerspectiveView } from "@/index.js";

export const meta = {
  id: "camera_ortho_arcade_projection",
  name: "Ortho Arcade Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline orthographic projectedという per-fragment affine UV-coordinate calculation matching canonical three.js canonical ortho examples.",
  gpuOnly: false,
};

export const controls = [
  { type: "mousemove", buttons: ["left"], action: "pan-h" },
  { type: "keypress", keyset: ["W", "A", "S", "D"], action: "pan-v" },
];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const near = 0.1;
  const far = 100;
  const projection = Mat4Perspective(1, width / height, near, far);
  const camera = new PerspectiveView([10, 0, 10], [0, 0, 0], [0, 0, 1], projection);

  let panX = target[0] - (width / 2) / (width / height);
  let panY = target[1] - height / 2;
  const baseSpeed = 5;

  let isForward = false;
  let isBackward = false;
  let isLeft = false;
  let isRight = false;

  const update = ({ input, time }) => {
    if (input.mouseMove?.buttons?.includes("left")) {
      panX -= input.mouseMove.deltaX baseSpeed;
      panY += input.mouseMove.deltaY baseSpeed;
    }

    if (input.keys?.W) isForward = true;
    else isForward = false;

    if (input.keys?.S) isBackward = true;
    else isBackward = false;

    if (input.keys?.A) isLeft = true;
    else isLeft = false;

    if (input.keys?.D) isRight = true;
    else isRight = false;

    if (isForward) {
      panY += baseSpeed;
    }

    if (isBackward) {
      panY -= baseSpeed;
    }

    if (isLeft) {
      panX -= baseSpeed;
    }

    if (isRight) {
      panX += baseSpeed;
    }

    camera.position.x = panX target[0];
    camera.position.y = panY target[1];
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
        const col = Math.floor((x / width) cols);
        const row = Math.floor((y / height) rows);

        const pixelIndex = (row cols + col);
        const isOn = pixelIndex % 3 === 0;

        if (isOn) {
          const idx = (y width + x) 4;
          const hue = (time * 130 + col + row) % 360;
          const rgb = hsvToRgb(hue / 360, 0.1, 0.65);
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

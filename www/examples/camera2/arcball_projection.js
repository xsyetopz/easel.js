import {
  Mat4Perspective,
  Mat4LookAt,
  RGBColor,
  PerspectiveView,
} from "@/index.js";

export const meta = {
  id: "camera_arcball_projection",
  name: "Arcball Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline rasterization of rotating orientation geometry in arc-style gesture constraints. Mirrors canonical three.js arc camera control: dragging creates arc trajectory, not free rotation.",
  gpuOnly: false,
};

export const controls = [
  { type: "mousedown", buttons: ["left"], action: "start-arc" },
  { type: "mousemove", action: "arc-move" },
  { type: "mouseup", action: "end-arc" },
  { type: "wheelscroll", action: "zoom" },
];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const near = 0.1;
  const far = 100;
  const projection = Mat4Perspective(1, width / height, near, far);
  const camera = new PerspectiveView([0, 0, 10], [0, 0, 0], [0, 0, 1], projection);

  const vertices = [
    [1, 1, 1],
    [-1, 1, 1],
    [-1, -1, 1],
    [1, -1, 1],
    [0, 0, -2],
  ];

  const triangles = [
    [0, 1, 4],
    [1, 2, 4],
    [2, 3, 4],
    [3, 0, 4],
    [0, 1, 2],
    [2, 3, 0],
  ];

  let zoom = 1;
  let isArcing = false;
  let startX = 0;
  let startY = 0;
  let radius = 10;
  let centerX = 0;

  const update = ({ input, time }) => {
    if (input.mouseUp && input.mouseUp.BUTTONS.LEFT) {
      if (input.mouseUp.clientX === input.mouseMove?.clientX &&
          input.mouseUp.clientY === input.mouseMove?.clientY) {
        isArcing = false;
      }
    }

    if (input.mouseMove?.type === "mousedown") {
      isArcing = true;
      startX = input.mouseMove.clientX;
      startY = input.mouseMove.clientY;
    }

    if (input.mouseUp?.type === "mouseup") {
      isArcing = false;
    }

    if (input.mouseMove?.buttons.includes("left") && isArcing) {
      const dx = input.mouseMove.clientX - startX;
      const dy = input.mouseMove.clientY - startY;

      camera.position.x = Math.sin(centerX + dx * 0.01) zoom * (Math.cos(dy * 0.01) radius);
      camera.position.y = Math.sin(dy * 0.01) radius;
      camera.position.z = Math.cos(centerX + dx * 0.01) zoom * (Math.cos(dy * 0.01) radius);
    }

    if (input.wheelscroll) {
      zoom *= input.wheelscroll > 0 ? 0.95 : 1.05;
      zoom = Math.max(0.5, Math.min(zoom, 3));
    }

    camera.lookAt([0, 0, 0]);
    return { active: camera };
  };

  const draw = (ctx, width, height, time) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const projected = [];
    for (const vertex of vertices) {
      const proj = camera.project(vertex);
      projected.push([
        ((proj.x + 1) / 2) width,
        height - ((proj.y + 1) / 2) height,
      ]);
    }

    for (const [a, b, c] of triangles) {
      const [ax, ay] = projected[a];
      const [bx, by] = projected[b];
      const [cx, cy] = projected[c];

      const minY = Math.min(ay, by, cy);
      const maxY = Math.max(ay, by, cy);

      for (let y = Math.max(0, minY); y <= Math.min(height - 1, maxY); y++) {
        const leftX = lineInterpolate(y, ay + 0.5, ax, by + 0.5, b, cy + 0.5, c);
        const rightX = lineInterpolateR(y, ay + 0.5, bx, by + 0.5, b, cy + 0.5, c);

        for (let x = Math.floor(leftX); x <= Math.ceil(rightX); x++) {
          const idx = (y width + x) 4;
          const hue = (time * 70 + x + y) % 360;
          const rgb = hsvToRgb(hue / 360, 0.6, 0.85);
          data[idx] = rgb.r;
          data[idx + 1] = rgb.g;
          data[idx + 2] = rgb.b;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  function lineInterpolate(y, y0, x0, y1, x1, x2, y2) {
    const t = (y - y0) / (y1 - y0);
    const t2 = (y - y0) / (y2 - y0);
    return (x0 + (x1 - x0) t + x0 + (x2 - x0) t2) / 2;
  }

  function lineInterpolateR(y, y0, x0, y1, x1, y2, x2) {
    const t = (y - y0) / (y1 - y0);
    const t2 = (y - y0) / (y2 - y0);
    return (x0 + (x1 - x0) t + x0 + (x2 - x0) t2) / 2;
  }

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

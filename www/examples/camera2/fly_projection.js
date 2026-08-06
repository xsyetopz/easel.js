import {
  Mat4Perspective,
  Mat4LookAt,
  BasicMaterial,
  RGBColor,
  PerspectiveView,
} from "@/index.js";

export const meta = {
  id: "camera_fly_projection",
  name: "Fly Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline rasterization of rotating orientation geometry in fly-style orbital motion, matching canonical three.js target gestures without borrowing three.js naming quirks.",
  gpuOnly: false,
};

export const controls = [
  { type: "mousemove", buttons: ["left"], action: "orbit" },
  { type: "wheelscroll", action: "zoom" },
  { type: "keys", keyset: ["W", "A", "S", "D"], action: "forward" },
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

  let yaw = 0;
  let pitch = 0;
  let zoom = 1;

  const update = ({ input, time }) => {
    if (input.mouseButtons && input.mouseButtons.LEFT) {
      yaw -= input.mouseDelta.x * 0.01;
      pitch -= input.mouseDelta.y * 0.01;
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }

    if (input.wheelscroll) {
      zoom *= input.wheelscroll > 0 ? 0.95 : 1.05;
      zoom = Math.max(0.5, Math.min(zoom, 3));
    }

    if (input.keys) {
      const speed = 1;
      if (input.keys.W) {
        camera.position.x -= Math.sin(yaw) speed;
        camera.position.z -= Math.cos(yaw) speed;
      }
      if (input.keys.S) {
        camera.position.x += Math.sin(yaw) speed;
        camera.position.z += Math.cos(yaw) speed;
      }
      if (input.keys.A) {
        camera.position.x -= Math.cos(yaw) speed;
        camera.position.z += Math.sin(yaw) speed;
      }
      if (input.keys.D) {
        camera.position.x += Math.cos(yaw) speed;
        camera.position.z -= Math.sin(yaw) speed;
      }
    }

    camera.lookAt([0, 0, 0]);

    return { active: camera };
  };

  const draw = (ctx, width, height, time) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const projected = [];
    for (const vertex of vertices) {
      projected.push(camera.project(vertex).map(val => {
        const screenX = ((val.x + 1) / 2) width;
        const screenY = height - ((val.y + 1) / 2) height;
        return [screenX, screenY];
      }));
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
          const hue = (time * 60 + Math.sqrt((x - width / 2)² + (y - height / 2)²)) % 360;
          const rgb = hsvToRgb(hue / 360, 0.7, 0.9);
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
    const xLeft2 = x0 + (x1 - x0) t;
    const t2 = (y - y0) / (y2 - y0);
    const xRight = x0 + (x2 - x0) t2;
    return (xLeft2 + xRight) / 2;
  }

  function lineInterpolateR(y, y0, x0, y1, x1, y2, x2) {
    const t = (y - y0) / (y1 - y0);
    const xLeft = x0 + (x1 - x0) t;
    const t2 = (y - y0) / (y2 - y0);
    const xRight2 = x0 + (x2 - x0) t2;
    return (xLeft + xRight2) / 2;
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

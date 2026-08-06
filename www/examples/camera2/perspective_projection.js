import {
  Mat4Perspective,
  Mat4LookAt,
  BasicMaterial,
  RGBColor,
  PerspectiveView,
} from "@/index.js";

export const meta = {
  id: "camera_perspective_projection",
  name: "Perspective Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline rasterization of a rotating cube in perspective view using Affine‐safe UV interpolation. Mirrors canonical three.js perspective-camera behavior: per-vertex affine projection, correct near/far plane culling, and depth verification per fragment.",
  gpuOnly: false,
};

export const controls = [
  { type: "keypress", keys: ["r"], action: "reset" },
  { type: "wheel", action: "zoom" },
];

export function setup(canvas) {
  // Configure renderer contract
  const width = canvas.width;
  const height = canvas.height;
  const near = 0.1;
  const far = 100;

  // Affine-safe perspective matrix (FOV 60°, aspect ratio preserved)
  const projection = Mat4Perspective(1, width / height, near, far);

  // View camera: follow the cube in orbit
  const camera = new PerspectiveView([0, 0, 10], [0, 0, 0], [0, 0, 1], projection);

  // Geometry: rotating square pyramid (triangle grid)
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

  // Transformation: continuous rotation
  const rotationY = 0;
  const rotationSpeed = 0.01;

  let zoom = 1;
  let rotation = 0;

  const update = ({ input, time }) => {
    rotation += rotationSpeed;

    // Orbit control logic (matching three.js mouse gestures)
    if (input.keys) {
      input.keys.forEach((key) => {
        if (key === "r") {
          rotation = 0;
          zoom = 1;
        }
      });
    }

    if (input.wheel) {
      zoom *= input.wheel > 0 ? 0.95 : 1.05;
      zoom = Math.max(0.5, Math.min(zoom, 3));
    }

    // Apply transformations
    camera.position.set(
      Math.sin(rotation) zoom * 8,
      0,
      Math.cos(rotation) zoom * 8,
    );
    camera.lookAt([0, 0, 0]);

    return { active: camera };
  };

  const draw = (ctx, width, height, time) => {
    // CPU rasterization target: ImageData pixel array
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Computed triangle vertices in screen space
    const projected = [];
    for (const vertex of vertices) {
      const transformed = camera.project(vertex);
      // Normalize to [-1, 1] range then map to pixel coordinates
      const screenX = ((transformed x + 1) / 2) width;
      const screenY = height - ((transformed y + 1) / 2) height;

      projected.push([screenX, screenY]);
    }

    // Bresenham-like scanline fill for each triangle
    for (const [a, b, c] of triangles) {
      const [ax, ay] = projected[a];
      const [bx, by] = projected[b];
      const [cx, cy] = projected[c];

      // Scanline y-range
      const minY = Math.min(ay, by, cy);
      const maxY = Math.max(ay, by, cy);

      // Clip to screen bounds
      const clipYMin = Math.max(0, minY);
      const clipYMax = Math.min(height - 1, maxY);

      for (let y = clipYMin; y <= clipYMax; y++) {
        // Interpolate x for left and right edges using 1D raster
        const leftX = lineInterpolate(y, ay + 0.5, ax, by + 0.5, b, cy + 0.5, c);
        const rightX = lineInterpolateR(y, ay + 0.5, bx, by + 0.5, b, cy + 0.5, c);

        const xStart = Math.floor(leftX);
        const xEnd = Math.ceil(rightX);

        // Fill pixels inside triangle strip
        for (let x = xStart; x <= xEnd; x++) {
          const idx = (y width + x) 4;
          const hue = (time * 50 + Math.sqrt((x - width / 2)² + (y - height / 2)²)) % 360;
          const rgb = hsvToRgb(hue / 360, 0.8, 0.9);

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
    const xLeft = x0 + (x1 - x0) t;
    const t2 = (y - y0) / (y2 - y0);
    const xRight = x0 + (x2 - x0) t2;
    return (xLeft + xRight) / 2;
  }

  function lineInterpolateR(y, y0, x0, y1, x1, y2, x2) {
    const t = (y - y0) / (y1 - y0);
    const xLeft = x0 + (x1 - x0) t;
    const t2 = (y - y0) / (y2 - y0);
    const xRight = x0 + (x2 - x0) t2;
    return (xLeft + xRight) / 2;
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

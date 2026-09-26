// Headless pixel capture for EASEL: a canvas stand-in whose 2D context keeps
// the ImageData that Renderer.render uploads with putImageData.

import {
  BasicMaterial,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Renderer,
  Scene,
} from "@xsyetopz/easel";

export interface Captured {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function captureRenderer(width: number, height: number) {
  let captured: Captured | undefined;
  const context = {
    imageSmoothingEnabled: true,
    putImageData(image: Captured): void {
      captured = image;
    },
  };
  const canvas = {
    width,
    height,
    isConnected: true,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  const renderer = new Renderer({ canvas, width, height });
  return {
    renderer,
    pixel(x: number, y: number): [number, number, number] {
      if (captured === undefined) throw new Error("nothing was rendered");
      const i = (y * captured.width + x) * 4;
      return [
        captured.data[i] ?? 0,
        captured.data[i + 1] ?? 0,
        captured.data[i + 2] ?? 0,
      ];
    },
    // Number of pixels that are not pure black (the default background).
    drawn(): number {
      if (captured === undefined) throw new Error("nothing was rendered");
      let count = 0;
      const data = captured.data;
      for (let i = 0; i < data.length; i += 4) {
        if ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0) > 0) {
          count++;
        }
      }
      return count;
    },
  };
}

// An orthographic camera at z = 5 that frames x and y in -1..1.
export function frontCamera(): OrthographicCamera {
  const camera = new OrthographicCamera({
    left: -1,
    right: 1,
    top: 1,
    bottom: -1,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 5);
  return camera;
}

// Renders one full-frame quad with `material` over a grey `background`
// (default black) and returns the red channel of the centre pixel.
export function centreRed(material: BasicMaterial, background = 0): number {
  const { renderer, pixel } = captureRenderer(8, 8);
  const scene = new Scene();
  scene.background = background * 0x010101;
  scene.add(new Mesh(new PlaneGeometry(4, 4), material));
  const camera = new OrthographicCamera({
    left: -1,
    right: 1,
    top: 1,
    bottom: -1,
    near: 0.1,
    far: 10,
  });
  camera.position.set(0, 0, 5);
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  return pixel(4, 4)[0];
}

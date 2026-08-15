import { performance } from "node:perf_hooks";
import {
  createBenchmarkCanvas,
  createOrthoCamera,
} from "./benchmark-helpers.mjs";
export function createCanvasUploadWorkload(EASEL) {
  return {
    name: "canvas-upload-call",
    description:
      "240 boxes rendered through a deterministic Canvas2D upload stub; exercises upload timing path.",
    create() {
      const width = 480;
      const height = 270;
      const uploadSink = { value: 0 };
      const canvas = createBenchmarkCanvas(width, height, uploadSink);
      const scene = new EASEL.Scene();
      const renderer = new EASEL.Renderer({
        canvas,
        width,
        height,
        sortObjects: true,
      });
      const camera = createOrthoCamera(EASEL, width, height, 16);
      camera.position.set(0, 12, 22);
      camera.lookAt(new EASEL.Vector3(0, 0, 0));
      scene.add(new EASEL.AmbientLight(0xffffff, 0.25));
      const light = new EASEL.DirectionalLight(0xffffff, 0.85);
      light.position.set(4, 9, 6);
      scene.add(light);
      const root = new EASEL.Group();
      scene.add(root);
      const geometry = new EASEL.BoxGeometry(0.58, 0.58, 0.58);
      geometry.computeBoundingSphere();
      const material = new EASEL.LambertMaterial({
        color: 0x74c0fc,
        shading: EASEL.Shading.Flat,
      });
      const columns = 20;
      const rows = 12;
      for (let z = 0; z < rows; z++) {
        for (let x = 0; x < columns; x++) {
          const mesh = new EASEL.Mesh(geometry, material);
          mesh.position.set((x - columns / 2) * 0.62, 0, (z - rows / 2) * 0.62);
          root.add(mesh);
        }
      }
      return {
        camera,
        renderer,
        scene,
        metadata: { width, height, meshes: columns * rows, uploadStub: true },
        step(frame) {
          root.rotation.y = Math.sin(frame * 0.004) * 0.35;
        },
        run(frame, timings) {
          this.step(frame);
          this.renderer.render(this.scene, this.camera, timings);
          timings.uploadSink = uploadSink.value & 1;
        },
      };
    },
  };
}

export function createFramebufferCaptureWorkload(EASEL) {
  return {
    name: "framebuffer-capture-readback",
    description:
      "128x128 readback from a 320x180 ImageData source; framebuffer texture capture allocation/copy path.",
    create() {
      const sourceWidth = 320;
      const sourceHeight = 180;
      const captureWidth = 128;
      const captureHeight = 128;
      const sourceData = new Uint8ClampedArray(sourceWidth * sourceHeight * 4);
      for (let i = 0; i < sourceData.length; i += 4) {
        const pixel = (i / 4) | 0;
        sourceData[i] = pixel & 255;
        sourceData[i + 1] = (pixel >> 3) & 255;
        sourceData[i + 2] = (pixel >> 7) & 255;
        sourceData[i + 3] = 255;
      }
      const source = new ImageData(sourceData, sourceWidth, sourceHeight);
      const texture = new EASEL.FramebufferTexture(captureWidth, captureHeight);
      let sink = 0;
      return {
        metadata: { sourceWidth, sourceHeight, captureWidth, captureHeight },
        run(frame, timings) {
          const x = frame % (sourceWidth - captureWidth);
          const y = (frame * 3) % (sourceHeight - captureHeight);
          const start = performance.now();
          texture.capture(source, x, y);
          timings.captureMs = performance.now() - start;
          const data = texture.data?.data;
          if (data) sink = (sink + data[0] + data.at(-4)) | 0;
          timings.captureSink = sink & 1;
        },
      };
    },
  };
}

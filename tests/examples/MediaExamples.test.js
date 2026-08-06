import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

const routes = [
  [
    "../../www/examples/canvas/media/canvas_materials_video.js",
    "webgl_materials_video",
  ],
  [
    "../../www/examples/canvas/media/canvas_materials_video_webcam.js",
    "webgl_materials_video_webcam",
  ],
  [
    "../../www/examples/canvas/media/canvas_materials_video_webgpu.js",
    "webgpu_materials_video",
  ],
  [
    "../../www/examples/canvas/media/canvas_morphtargets_webcam.js",
    "webgl_morphtargets_webcam",
  ],
  [
    "../../www/examples/canvas/media/canvas_video_frame.js",
    "webgpu_video_frame",
  ],
  [
    "../../www/examples/canvas/media/canvas_video_kinect.js",
    "webgl_video_kinect",
  ],
  [
    "../../www/examples/canvas/media/canvas_video_panorama.js",
    "webgpu_video_panorama",
  ],
  [
    "../../www/examples/canvas/media/canvas_video_panorama_equirectangular.js",
    "webgl_video_panorama_equirectangular",
  ],
  [
    "../../www/examples/canvas/media/canvas_worker_offscreencanvas.js",
    "webgl_worker_offscreencanvas",
  ],
];

async function mountRoutes(dom) {
  const modules = await Promise.all(
    routes.map(([modulePath]) => import(modulePath)),
  );
  const ids = [];
  const instances = [];
  const statuses = [];
  for (let index = 0; index < routes.length; index++) {
    const expectedId = routes[index][1];
    const example = modules[index];
    const canvas = dom.window.document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    dom.window.document.body.append(canvas);
    const instance = example.setup(canvas);
    ids.push([example.meta.id, expectedId]);
    instances.push(instance);
    instance?.cleanup();
    statuses.push(
      dom.window.document.querySelectorAll("[data-media-status]").length,
    );
  }
  return { ids, instances, statuses };
}

describe("CPU media and worker examples", () => {
  it("mounts and cleans every browser-media route without device APIs", async () => {
    const previousDocument = globalThis.document;
    const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
    const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const dom = new JSDOM("<!doctype html><body></body>");
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: dom.window.document,
    });
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: () => 1,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: () => undefined,
    });
    dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
    dom.window.HTMLMediaElement.prototype.pause = () => undefined;
    dom.window.HTMLMediaElement.prototype.load = () => undefined;
    try {
      const result = await mountRoutes(dom);
      expect(result.ids).toEqual(
        routes.map(([, expectedId], _index) => [expectedId, expectedId]),
      );
      expect(result.instances.every((instance) => instance !== undefined)).toBe(
        true,
      );
      expect(result.statuses).toEqual(routes.map(() => 0));
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: previousDocument,
      });
      Object.defineProperty(globalThis, "requestAnimationFrame", {
        configurable: true,
        value: previousRequestAnimationFrame,
      });
      Object.defineProperty(globalThis, "cancelAnimationFrame", {
        configurable: true,
        value: previousCancelAnimationFrame,
      });
      dom.window.close();
    }
  });

  it("registers exact media IDs with source pairs", async () => {
    const { examples } = await import("../../www/examples/registry.ts");
    for (const [, expectedId] of routes) {
      const example = examples.find((entry) => entry.meta.id === expectedId);
      expect(example).toBeDefined();
      expect(example?.easelSource).toContain("EASEL");
      expect(example?.threeSource).toContain("THREE");
    }
  });
});

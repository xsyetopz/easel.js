import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.js";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { Scene } from "@/core/Scene.js";
import { CSS3DObject } from "@/objects/CSS3DObject.js";
import { CSS3DRenderer } from "@/renderers/CSS3DRenderer.js";
import { Vector3 } from "@/math/Vector3.js";

function withDocument<T>(callback: (document: Document) => T): T {
  const previous = globalThis.document;
  const dom = new JSDOM("<!doctype html><body></body>");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: dom.window.document,
  });
  try {
    return callback(dom.window.document);
  } finally {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: previous,
    });
    dom.window.close();
  }
}

describe("CSS3DRenderer", () => {
  it("degrades to a DOM-free renderer in non-browser runtimes", () => {
    const renderer = new CSS3DRenderer({ width: 640, height: 360 });
    expect(renderer.domElement).toBeUndefined();
    expect(() =>
      renderer.render(new Scene(), new PerspectiveCamera()),
    ).not.toThrow();
  });

  it("projects CSS3DObject elements through a perspective camera", () => {
    withDocument((document) => {
      const renderer = new CSS3DRenderer({ width: 640, height: 360 });
      const scene = new Scene();
      const camera = new PerspectiveCamera({ fov: 45, aspect: 640 / 360 });
      camera.position.z = 5;
      camera.lookAt(new Vector3(0, 0, 0));
      const element = document.createElement("div");
      const object = new CSS3DObject(element);
      object.position.x = 1;
      scene.add(object);
      renderer.render(scene, camera);
      expect(element.parentElement).not.toBeNull();
      expect(element.style.transform).toContain("matrix3d");
      expect(element.style.display).toBe("");
      object.visible = false;
      renderer.render(scene, camera);
      renderer.dispose();
      expect(element.parentElement).toBeNull();
    });
  });

  it("accepts orthographic camera projection and validates dimensions", () => {
    withDocument(() => {
      const renderer = new CSS3DRenderer();
      const scene = new Scene();
      const camera = new OrthographicCamera({
        left: -4,
        right: 4,
        top: 2,
        bottom: -2,
      });
      renderer.render(scene, camera);
      expect(renderer.size).toEqual({ width: 300, height: 150 });
      expect(() => renderer.setSize(0, 100)).toThrow(RangeError);
      expect(() => renderer.setSize(100, Number.NaN)).toThrow(RangeError);
    });
  });
});

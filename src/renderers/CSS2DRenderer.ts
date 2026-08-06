import type { Camera } from "../cameras/Camera.ts";
import type { Scene } from "../core/Scene.ts";
import { Vector3 } from "../math/Vector3.ts";
import { CSS2DObject } from "../objects/CSS2DObject.ts";

/** Construction options for the DOM-backed CSS2D renderer. */
export interface CSS2DRendererOptions {
  /** Initial viewport width in CSS pixels. */
  width?: number;
  /** Initial viewport height in CSS pixels. */
  height?: number;
  /** Existing overlay root to populate. */
  element?: HTMLDivElement;
}

/** Projects EASEL nodes into an absolutely positioned DOM overlay. */
export class CSS2DRenderer {
  /** Root element containing projected labels. */
  readonly domElement: HTMLDivElement | undefined;
  #width = 300;
  #height = 150;

  /** Creates a CSS2D overlay without allocating GPU resources. */
  constructor(options: CSS2DRendererOptions = {}) {
    this.domElement = options.element ?? createRoot();
    this.setSize(options.width ?? 300, options.height ?? 150);
  }

  /** Sets the overlay viewport dimensions. */
  setSize(width: number, height: number): void {
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new RangeError(
        "CSS2DRenderer.setSize requires positive finite dimensions",
      );
    }
    this.#width = width;
    this.#height = height;
    if (this.domElement) {
      this.domElement.style.width = `${width}px`;
      this.domElement.style.height = `${height}px`;
    }
  }

  /** Updates every CSS2DObject position from the supplied camera. */
  render(scene: Scene, camera: Camera): void {
    const root = this.domElement;
    if (!root) return;
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);
    scene.traverseVisible((node) => {
      if (!(node instanceof CSS2DObject)) return;
      const point = new Vector3()
        .setFromMatrixPosition(node.matrixWorld)
        .project(camera);
      const visible = point.z >= -1 && point.z <= 1;
      node.element.style.display = visible ? "" : "none";
      node.element.style.position = "absolute";
      node.element.style.transform = `translate(-50%, -50%) translate(${(point.x * 0.5 + 0.5) * this.#width}px, ${(-point.y * 0.5 + 0.5) * this.#height}px)`;
      if (node.element.parentElement !== root) root.append(node.element);
    });
  }
}

function createRoot(): HTMLDivElement | undefined {
  if (typeof globalThis.document === "undefined") return;
  const root = globalThis.document.createElement("div");
  root.style.position = "relative";
  root.style.overflow = "hidden";
  return root;
}

import type { Camera } from "../cameras/Camera.ts";
import type { Scene } from "../core/Scene.ts";
import { BasicMaterial } from "../materials/BasicMaterial.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Color } from "../math/Color.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Line } from "../objects/Line.ts";
import { LineLoop } from "../objects/LineLoop.ts";
import { LineSegments } from "../objects/LineSegments.ts";
import { Mesh } from "../objects/Mesh.ts";
import { SVGObject } from "../objects/SVGObject.ts";

/** Construction options for the DOM-backed SVG renderer. */
export interface SVGRendererOptions {
  /** Initial viewport width in CSS pixels. */
  width?: number;
  /** Initial viewport height in CSS pixels. */
  height?: number;
  /** Existing SVG root to populate instead of creating one. */
  svg?: SVGSVGElement;
  /** Clears existing children before each render. */
  autoClear?: boolean;
}

/** CPU/DOM SVG renderer for line, basic mesh, and custom SVGObject scenes. */
export class SVGRenderer {
  /** SVG root populated by render, when a browser document is available. */
  readonly domElement: SVGSVGElement | undefined;
  /** Whether render removes prior output before appending new elements. */
  autoClear: boolean;
  #width = 300;
  #height = 150;
  readonly #clearColor = new Color(0x000000);

  /** Constructs a DOM-backed renderer without allocating GPU resources. */
  constructor(options: SVGRendererOptions = {}) {
    this.autoClear = options.autoClear ?? true;
    this.domElement = options.svg ?? createSVGRoot();
    this.setSize(options.width ?? 300, options.height ?? 150);
  }

  /** Sets the SVG viewport and view box. */
  setSize(width: number, height: number): void {
    if (
      !(
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      )
    )
      throw new RangeError(
        "SVGRenderer.setSize requires positive finite dimensions",
      );
    this.#width = width;
    this.#height = height;
    this.domElement?.setAttribute("width", String(width));
    this.domElement?.setAttribute("height", String(height));
    this.domElement?.setAttribute(
      "viewBox",
      `${-width / 2} ${-height / 2} ${width} ${height}`,
    );
  }

  /** Returns the current SVG viewport dimensions. */
  get size(): { width: number; height: number } {
    return { width: this.#width, height: this.#height };
  }

  /** Sets the background color used by the SVG root. */
  setClearColor(color: Color | number | string): void {
    this.#clearColor.set(color);
    this.domElement?.setAttribute(
      "style",
      `background:${this.#clearColor.style}`,
    );
  }

  /** Renders supported EASEL scene nodes into SVG DOM elements. */
  render(scene: Scene, camera: Camera): void {
    const svg = this.domElement;
    if (!svg) return;
    if (this.autoClear) while (svg.firstChild) svg.removeChild(svg.firstChild);
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);
    const viewProjection = camera.projectionMatrix
      .clone()
      .multiply(camera.matrixWorldInverse);
    scene.traverseVisible((node) => {
      if (node instanceof SVGObject) {
        const clone = node.node.cloneNode(true) as SVGElement;
        const point = new Vector3().setFromMatrixPosition(node.matrixWorld);
        point.applyMatrix4(viewProjection);
        clone.setAttribute(
          "transform",
          `translate(${format((point.x * this.#width) / 2)} ${format((-point.y * this.#height) / 2)})`,
        );
        svg.append(clone);
        return;
      }
      if (
        node instanceof Line ||
        node instanceof LineSegments ||
        node instanceof LineLoop
      ) {
        this.#renderLine(svg, node, viewProjection);
        return;
      }
      if (node instanceof Mesh && node.material instanceof BasicMaterial) {
        this.#renderMesh(svg, node, viewProjection);
      }
    });
  }

  #renderLine(
    svg: SVGSVGElement,
    line: Line,
    viewProjection: import("../math/Matrix4.ts").Matrix4,
  ): void {
    const geometry = line.geometry;
    const position = geometry?.getAttribute("position");
    if (
      !(geometry && position) ||
      position.count < 2 ||
      !(line.material instanceof LineMaterial)
    )
      return;
    const points: string[] = [];
    for (let index = 0; index < position.count; index++) {
      const point = new Vector3(
        position.getX(index),
        position.getY(index),
        position.getZ(index),
      );
      point.applyMatrix4(line.matrixWorld).applyMatrix4(viewProjection);
      points.push(
        `${format((point.x * this.#width) / 2)},${format((-point.y * this.#height) / 2)}`,
      );
    }
    const element = documentCreate("polyline");
    element.setAttribute("points", points.join(" "));
    element.setAttribute("fill", "none");
    applyLineStyle(element, line.material);
    if (line instanceof LineLoop)
      element.setAttribute("points", `${points.join(" ")} ${points[0] ?? ""}`);
    if (line instanceof LineSegments) {
      for (let index = 0; index + 1 < points.length; index += 2) {
        const segment = documentCreate("line");
        segment.setAttribute("x1", points[index]?.split(",")[0] ?? "0");
        segment.setAttribute("y1", points[index]?.split(",")[1] ?? "0");
        segment.setAttribute("x2", points[index + 1]?.split(",")[0] ?? "0");
        segment.setAttribute("y2", points[index + 1]?.split(",")[1] ?? "0");
        applyLineStyle(segment, line.material);
        svg.append(segment);
      }
    } else svg.append(element);
  }

  #renderMesh(
    svg: SVGSVGElement,
    mesh: Mesh,
    viewProjection: import("../math/Matrix4.ts").Matrix4,
  ): void {
    const geometry = mesh.geometry;
    const position = geometry?.getAttribute("position");
    if (!(geometry && position && mesh.material instanceof BasicMaterial))
      return;
    const index = geometry.index;
    const count = index ? index.length : position.count;
    for (let offset = 0; offset + 2 < count; offset += 3) {
      const indices = index
        ? [index[offset] ?? 0, index[offset + 1] ?? 0, index[offset + 2] ?? 0]
        : [offset, offset + 1, offset + 2];
      const points = indices.map((vertex) => {
        const point = new Vector3(
          position.getX(vertex),
          position.getY(vertex),
          position.getZ(vertex),
        );
        point.applyMatrix4(mesh.matrixWorld).applyMatrix4(viewProjection);
        return `${format((point.x * this.#width) / 2)},${format((-point.y * this.#height) / 2)}`;
      });
      const element = documentCreate("polygon");
      element.setAttribute("points", points.join(" "));
      element.setAttribute("fill", mesh.material.color.style);
      svg.append(element);
    }
  }
}

function createSVGRoot(): SVGSVGElement | undefined {
  if (typeof globalThis.document === "undefined") return;
  return globalThis.document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );
}

function documentCreate(name: "line" | "polyline" | "polygon"): SVGElement {
  if (typeof globalThis.document === "undefined")
    throw new Error("SVGRenderer requires a browser document");
  return globalThis.document.createElementNS(
    "http://www.w3.org/2000/svg",
    name,
  );
}

function applyLineStyle(element: SVGElement, material: LineMaterial): void {
  element.setAttribute("stroke", material.color.style);
  element.setAttribute("stroke-width", String(material.linewidth));
  if (material.type === "DashedLineMaterial") {
    const dashed = material as LineMaterial & {
      dashSize: number;
      gapSize: number;
    };
    element.setAttribute(
      "stroke-dasharray",
      `${dashed.dashSize} ${dashed.gapSize}`,
    );
  }
}

function format(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(4)).toString();
}

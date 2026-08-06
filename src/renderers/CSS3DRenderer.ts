import type { Camera, CameraView } from "../cameras/Camera.ts";
import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import type { Node } from "../core/Node.ts";
import type { Scene } from "../core/Scene.ts";
import { Vector3 } from "../math/Vector3.ts";
import { CSS3DObject, CSS3DSprite } from "../objects/CSS3DObject.ts";
import { Matrix4 } from "../math/Matrix4.ts";

/** Construction options for the DOM-backed CSS3D renderer. */
export interface CSS3DRendererOptions {
  /** Existing root element to populate. */
  element?: HTMLElement;
  /** Initial viewport width in CSS pixels. */
  width?: number;
  /** Initial viewport height in CSS pixels. */
  height?: number;
}

/** Applies hierarchical 3D transforms to DOM elements through CSS. */
export class CSS3DRenderer {
  /** Root element containing the CSS3D scene. */
  readonly domElement: HTMLElement | undefined;
  readonly #viewElement: HTMLDivElement | undefined;
  readonly #cameraElement: HTMLDivElement | undefined;
  readonly #renderedElements = new Set<HTMLElement>();
  #width = 300;
  #height = 150;

  /** Creates a CSS3D overlay without allocating GPU resources. */
  constructor(options: CSS3DRendererOptions = {}) {
    this.domElement = options.element ?? createRoot();
    const ownerDocument = this.domElement?.ownerDocument;
    if (this.domElement && ownerDocument) {
      this.domElement.style.overflow = "hidden";
      this.#viewElement = ownerDocument.createElement("div");
      this.#viewElement.style.transformOrigin = "0 0";
      this.#viewElement.style.pointerEvents = "none";
      this.#cameraElement = ownerDocument.createElement("div");
      this.#cameraElement.style.transformStyle = "preserve-3d";
      this.#viewElement.append(this.#cameraElement);
      this.domElement.append(this.#viewElement);
    }
    this.setSize(options.width ?? 300, options.height ?? 150);
  }

  /** Returns the current CSS viewport dimensions. */
  get size(): { width: number; height: number } {
    return { width: this.#width, height: this.#height };
  }

  /** Sets overlay and internal CSS viewport dimensions. */
  setSize(width: number, height: number): void {
    if (
      !(Number.isFinite(width) &&Number.isFinite(height) ) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new RangeError(
        "CSS3DRenderer.setSize requires positive finite dimensions",
      );
    }
    this.#width = width;
    this.#height = height;
    for (const element of [
      this.domElement,
      this.#viewElement,
      this.#cameraElement,
    ]) {
      if (element) {
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
      }
    }
  }

  /** Renders visible CSS3DObject nodes using the supplied EASEL camera. */
  render(scene: Scene, camera: Camera): void {
    const view = this.#viewElement;
    const cameraElement = this.#cameraElement;
    if (!(view && cameraElement)) return;
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);

    const cameraView = getCameraView(camera);
    const heightHalf = this.#height / 2;
    const widthHalf = this.#width / 2;
    const fov = (camera.projectionMatrix.elements[5] ?? 1) * heightHalf;
    if (cameraView?.enabled) {
      view.style.transform = `translate(${-cameraView.offsetX * (this.#width / cameraView.width)}px, ${-cameraView.offsetY * (this.#height / cameraView.height)}px) scale(${cameraView.fullWidth / cameraView.width}, ${cameraView.fullHeight / cameraView.height})`;
    } else {
      view.style.transform = "";
    }

    let tx = 0;
    let ty = 0;
    if (camera instanceof OrthographicCamera) {
      tx = -(camera.right + camera.left) / 2;
      ty = (camera.top + camera.bottom) / 2;
    }
    const scaleByViewOffset = cameraView?.enabled
      ? cameraView.height / cameraView.fullHeight
      : 1;
    const cameraCSSMatrix =
      camera instanceof OrthographicCamera
        ? `scale(${scaleByViewOffset}) scale(${fov}) translate(${epsilon(tx)}px, ${epsilon(ty)}px)${getCameraCSSMatrix(camera.matrixWorldInverse)}`
        : `scale(${scaleByViewOffset}) translateZ(${fov}px)${getCameraCSSMatrix(camera.matrixWorldInverse)}`;
    const perspective =
      camera instanceof OrthographicCamera ? "" : `perspective(${fov}px) `;
    cameraElement.style.transform = `${perspective}${cameraCSSMatrix}translate(${widthHalf}px, ${heightHalf}px)`;

    const visible = new Set<HTMLElement>();
    renderObject(scene, cameraElement, camera, visible, this.#renderedElements);
    for (const element of this.#renderedElements) {
      if (!visible.has(element)) element.style.display = "none";
    }
  }

  /** Removes renderer-owned internal elements and clears overlay state. */
  dispose(): void {
    for (const element of this.#renderedElements) element.remove();
    this.#viewElement?.remove();
    this.#renderedElements.clear();
  }
}

function renderObject(
  object: Node,
  cameraElement: HTMLElement,
  camera: Camera,
  visible: Set<HTMLElement>,
  managed: Set<HTMLElement>,
): void {
  if (!object.visible) {
    hideObject(object);
    return;
  }
  if (object instanceof CSS3DObject) {
    const element = object.element;
    managed.add(element);
    if (object.layers.test(camera.layers)) {
      element.style.display = "";
      element.style.transform =
        object instanceof CSS3DSprite
          ? getSpriteCSSMatrix(object, camera)
          : getObjectCSSMatrix(object.matrixWorld);
      if (element.parentElement !== cameraElement)
        cameraElement.append(element);
      visible.add(element);
    } else {
      element.style.display = "none";
    }
  }
  for (let index = 0; index < object.children.length; index++) {
    const child = object.children[index];
    if (child) renderObject(child, cameraElement, camera, visible, managed);
  }
}

function hideObject(object: Node): void {
  if (object instanceof CSS3DObject) object.element.style.display = "none";
  for (let index = 0; index < object.children.length; index++) {
    const child = object.children[index];
    if (child) hideObject(child);
  }
}

function getSpriteCSSMatrix(object: CSS3DSprite, camera: Camera): string {
  const matrix = camera.matrixWorldInverse.clone().transpose();
  if (object.rotation2D !== 0)
    matrix.multiply(new Matrix4().makeRotationZ(object.rotation2D));
  const position = new Vector3();
  const scale = new Vector3();
  object.matrixWorld.extractPosition(position);
  object.matrixWorld.extractScale(scale);
  matrix.setPosition(position);
  matrix.scale(scale);
  matrix.elements[3] = 0;
  matrix.elements[7] = 0;
  matrix.elements[11] = 0;
  matrix.elements[15] = 1;
  return getObjectCSSMatrix(matrix);
}

function getObjectCSSMatrix(matrix: Matrix4): string {
  const e = matrix.elements;
  const values = [
    e[0],
    e[1],
    e[2],
    e[3],
    -e[4]!,
    -e[5]!,
    -e[6]!,
    -e[7]!,
    e[8],
    e[9],
    e[10],
    e[11],
    e[12],
    e[13],
    e[14],
    e[15],
  ];
  return `translate(-50%, -50%) matrix3d(${values.map((value) => epsilon(value)).join(",")})`;
}

function getCameraCSSMatrix(matrix: Matrix4): string {
  const e = matrix.elements;
  const values = [
    e[0],
    -e[1]!,
    e[2],
    e[3],
    e[4],
    -e[5]!,
    e[6],
    e[7],
    e[8],
    -e[9]!,
    e[10],
    e[11],
    e[12],
    -e[13]!,
    e[14],
    e[15],
  ];
  return `matrix3d(${values.map((value) => epsilon(value)).join(",")})`;
}

function epsilon(value: number | undefined): number {
  if (value === undefined || Math.abs(value) < 1e-10) return 0;
  return value;
}

function createRoot(): HTMLElement | undefined {
  if (typeof globalThis.document === "undefined") return;
  const root = globalThis.document.createElement("div");
  root.style.position = "relative";
  return root;
}

function getCameraView(camera: Camera): CameraView | undefined {
  if (!("view" in camera)) return;
  const view = (camera as Camera & { view?: CameraView }).view;
  return view;
}

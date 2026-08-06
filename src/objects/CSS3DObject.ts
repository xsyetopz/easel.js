import { Node } from "../core/Node.ts";

/** Scene-graph node that places an HTMLElement with a CSS3D transform. */
export class CSS3DObject extends Node {
  /** Serialization discriminator for CSS3D overlay nodes. */
  override type = "CSS3DObject";
  /** Type guard identifying a CSS3D overlay node. */
  readonly isCSS3DObject = true;
  /** DOM element transformed by {@link CSS3DRenderer}. */
  element: HTMLElement;

  /** Wraps an element, or creates a default div in a browser document. */
  constructor(element?: HTMLElement) {
    super();
    this.element = element ?? createElement("div");
    this.element.style.position = "absolute";
    this.element.style.pointerEvents = "auto";
    this.element.style.userSelect = "none";
    this.element.setAttribute("draggable", "false");
  }

  /** Returns an independent overlay node with a cloned DOM subtree. */
  override clone(): CSS3DObject {
    return new CSS3DObject(this.element.cloneNode(true) as HTMLElement).copy(
      this,
    );
  }

  /** Copies scene state and clones the wrapped DOM subtree. */
  override copy(source: CSS3DObject, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.element = source.element.cloneNode(true) as HTMLElement;
    return this;
  }
}

/** Camera-facing CSS3D overlay node with optional two-dimensional rotation. */
export class CSS3DSprite extends CSS3DObject {
  /** Serialization discriminator for CSS3D sprite nodes. */
  override type = "CSS3DSprite";
  /** Type guard identifying a CSS3D sprite node. */
  readonly isCSS3DSprite = true;
  /** Additional rotation applied in the camera-facing plane, in radians. */
  rotation2D = 0;

  /** Wraps an element as a camera-facing CSS3D sprite. */
  constructor(element?: HTMLElement) {
    super(element);
  }

  /** Returns an independent sprite with a cloned DOM subtree. */
  override clone(): CSS3DSprite {
    return new CSS3DSprite(this.element.cloneNode(true) as HTMLElement).copy(
      this,
    );
  }

  /** Copies sprite rotation and scene state. */
  override copy(source: CSS3DSprite, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.rotation2D = source.rotation2D;
    return this;
  }
}

function createElement(name: string): HTMLElement {
  if (typeof globalThis.document === "undefined") {
    throw new Error("CSS3DObject requires a browser document");
  }
  return globalThis.document.createElement(name);
}

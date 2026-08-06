import { Node } from "../core/Node.ts";

/** Scene-graph node for an absolutely positioned DOM element. */
export class CSS2DObject extends Node {
  /** Serialization discriminator for DOM overlay nodes. */
  override type = "CSS2DObject";
  /** Type guard identifying a CSS2D overlay node. */
  readonly isCSS2DObject = true;
  /** DOM element positioned by {@link CSS2DRenderer}. */
  readonly element: HTMLElement;

  /** Wraps an existing element in a projected scene node. */
  constructor(element: HTMLElement) {
    super();
    this.element = element;
  }

  /** Returns an independent overlay node with a cloned element. */
  override clone(): CSS2DObject {
    return new CSS2DObject(this.element.cloneNode(true) as HTMLElement).copy(
      this,
    );
  }

  /** Copies scene state while preserving the target element. */
  override copy(source: CSS2DObject, recursive: boolean = true): this {
    super.copy(source, recursive);
    return this;
  }
}

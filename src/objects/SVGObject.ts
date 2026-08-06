import { Node } from "../core/Node.ts";

/** Scene-graph wrapper for custom SVG elements, matching three's SVGObject. */
export class SVGObject extends Node {
  /** Serialization discriminator for custom SVG scene nodes. */
  override type = "SVGObject";
  /** Type guard identifying custom SVG scene nodes. */
  readonly isSVGObject = true;
  /** SVG element cloned into the renderer output. */
  readonly node: SVGElement;

  /** Wraps an existing SVG element in a scene-graph node. */
  constructor(node: SVGElement) {
    super();
    this.node = node;
  }

  /** Returns a clone with an independent SVG DOM subtree. */
  override clone(): SVGObject {
    return new SVGObject(this.node.cloneNode(true) as SVGElement).copy(this);
  }

  /** Copies transform and hierarchy state from another SVGObject. */
  override copy(source: SVGObject, recursive: boolean = true): this {
    super.copy(source, recursive);
    return this;
  }
}

import { Node } from "../core/Node.ts";

/** Scene-graph container with no renderable geometry of its own. */
export class Group extends Node {
  /** Serialization discriminator for this runtime type. */
  override type: string = "Group";

  /** Type guard identifying this concrete object type. */
  get isGroup(): true {
    return true;
  }

  /** Returns an independent copy of this group and its node state. */
  override clone(): Group {
    return new Group().copy(this);
  }
}

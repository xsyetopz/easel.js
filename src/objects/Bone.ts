import { Node } from "../core/Node.ts";

/** Scene-graph bone used by `SkinnedMesh` CPU skinning. */
export class Bone extends Node {
  /** Serialization discriminator for this runtime type. */
  override type: string = "Bone";

  /** Type guard identifying this concrete object type. */
  get isBone(): true {
    return true;
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): Bone {
    return new Bone().copy(this);
  }
}

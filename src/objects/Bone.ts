import { Node } from "../core/Node.ts";

/** Skeletal bone node used by SkinnedMesh. */
export class Bone extends Node {
	override type = "Bone";

	override clone(): Bone {
		return new Bone().copy(this);
	}
}

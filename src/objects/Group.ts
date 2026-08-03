import { Node } from "../core/Node.ts";

/** Empty container node for grouping children. */
export class Group extends Node {
  override type = "Group";
}

import { Node } from "../core/Node.js";

/** Empty container node for grouping children. */
export class Group extends Node {
	/** @override @type {string} */
	type = "Group";
}

import { Line } from "./Line.js";

/** Polyline with an implicit closing segment. */
export class LineLoop extends Line {
	override type = "LineLoop";
}

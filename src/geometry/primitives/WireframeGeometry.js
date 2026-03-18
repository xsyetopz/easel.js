import { Geometry } from "../Geometry.js";

/**
 * Outputs non-indexed line segments for every triangle edge of a Geometry.
 */
export class WireframeGeometry extends Geometry {
	/**
	 * @param {Geometry} geometry
	 */
	constructor(geometry) {
		super();

		this.type = "WireframeGeometry";
		this.parameters = { geometry };

		const posAttr = geometry.getAttribute("position");
		if (!posAttr) {
			this.setPositions(new Float32Array(0));
			return;
		}

		const srcPositions = posAttr.array;
		const srcIndex = geometry.index;

		const indexList = srcIndex
			? Array.from(srcIndex)
			: Array.from({ length: srcPositions.length / 3 }, (_, i) => i);

		/** @type {Set<string>} */
		const seen = new Set();
		/** @type {number[]} */
		const positions = [];

		/**
		 * @param {number} a
		 * @param {number} b
		 */
		function addEdge(a, b) {
			const key = a < b ? `${a}_${b}` : `${b}_${a}`;
			if (seen.has(key)) return;
			seen.add(key);
			positions.push(
				srcPositions[a * 3],
				srcPositions[a * 3 + 1],
				srcPositions[a * 3 + 2],
				srcPositions[b * 3],
				srcPositions[b * 3 + 1],
				srcPositions[b * 3 + 2],
			);
		}

		for (let i = 0; i < indexList.length; i += 3) {
			const a = indexList[i];
			const b = indexList[i + 1];
			const c = indexList[i + 2];
			addEdge(a, b);
			addEdge(b, c);
			addEdge(c, a);
		}

		this.setPositions(new Float32Array(positions));
	}
}

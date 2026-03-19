import { CylinderGeometry } from "./CylinderGeometry.js";

/**
 * Cone geometry - a cylinder with radiusTop=0.
 */
export class ConeGeometry extends CylinderGeometry {
	/**
	 * @param {number} [radius=1]
	 * @param {number} [height=1]
	 * @param {number} [radialSegments=32]
	 * @param {number} [heightSegments=1]
	 * @param {boolean} [openEnded=false]
	 * @param {number} [thetaStart=0]
	 * @param {number} [thetaLength=Math.PI*2]
	 */
	constructor(
		radius = 1,
		height = 1,
		radialSegments = 32,
		heightSegments = 1,
		openEnded = false,
		thetaStart = 0,
		thetaLength = Math.PI * 2,
	) {
		super(
			0,
			radius,
			height,
			radialSegments,
			heightSegments,
			openEnded,
			thetaStart,
			thetaLength,
		);

		this.type = "ConeGeometry";
		this.parameters = {
			radius,
			height,
			radialSegments,
			heightSegments,
			openEnded,
			thetaStart,
			thetaLength,
		};
	}
}

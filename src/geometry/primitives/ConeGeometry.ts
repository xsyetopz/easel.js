import { CylinderGeometry } from "./CylinderGeometry.ts";

/** Cone geometry - a cylinder with radiusTop=0. */
export class ConeGeometry extends CylinderGeometry {
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

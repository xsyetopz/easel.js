import { Vector2 } from "../../math/Vector2.ts";
import { LatheGeometry } from "./LatheGeometry.js";

/**
 * Capsule geometry built by revolving a hemisphere-cylinder-hemisphere profile.
 */
export class CapsuleGeometry extends LatheGeometry {
	/**
	 * @param {number} [radius=1]
	 * @param {number} [length=1]
	 * @param {number} [capSegments=4]
	 * @param {number} [radialSegments=8]
	 */
	constructor(radius = 1, length = 1, capSegments = 4, radialSegments = 8) {
		const path = [];
		const halfLength = length / 2;

		// bottom hemisphere (south pole → equator)
		for (let i = capSegments; i >= 0; i--) {
			const angle = (Math.PI / 2) * (i / capSegments);
			path.push(
				new Vector2(
					Math.cos(angle) * radius,
					-halfLength - Math.sin(angle) * radius,
				),
			);
		}

		// top hemisphere (equator → north pole)
		for (let i = 0; i <= capSegments; i++) {
			const angle = (Math.PI / 2) * (i / capSegments);
			path.push(
				new Vector2(
					Math.cos(angle) * radius,
					halfLength + Math.sin(angle) * radius,
				),
			);
		}

		super(path, radialSegments);

		this.type = "CapsuleGeometry";
		this.parameters = { radius, length, capSegments, radialSegments };
	}
}

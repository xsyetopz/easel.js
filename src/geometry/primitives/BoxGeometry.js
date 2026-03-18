import { Geometry } from "../Geometry.js";

/**
 * Box (rectangular cuboid) geometry with per-face segments.
 */
export class BoxGeometry extends Geometry {
	/**
	 * @param {number} [width=1]
	 * @param {number} [height=1]
	 * @param {number} [depth=1]
	 * @param {number} [widthSegments=1]
	 * @param {number} [heightSegments=1]
	 * @param {number} [depthSegments=1]
	 */
	constructor(
		width = 1,
		height = 1,
		depth = 1,
		widthSegments = 1,
		heightSegments = 1,
		depthSegments = 1,
	) {
		super();

		this.type = "BoxGeometry";
		this.parameters = {
			width,
			height,
			depth,
			widthSegments,
			heightSegments,
			depthSegments,
		};

		/** @type {number[]} */
		const positions = [];
		/** @type {number[]} */
		const normals = [];
		/** @type {number[]} */
		const uvs = [];
		/** @type {number[]} */
		const indices = [];
		let vertexCount = 0;

		/**
		 * Build one face of the box.
		 * @param {number} u - axis index for u direction (0=x,1=y,2=z)
		 * @param {number} v - axis index for v direction
		 * @param {number} w - axis index for normal direction
		 * @param {number} uDir - sign of u axis
		 * @param {number} vDir - sign of v axis
		 * @param {number} width - face width
		 * @param {number} height - face height
		 * @param {number} depth - face depth (offset along w)
		 * @param {number} gridX - segments along u
		 * @param {number} gridY - segments along v
		 */
		function buildPlane(
			u,
			v,
			w,
			uDir,
			vDir,
			width,
			height,
			depth,
			gridX,
			gridY,
		) {
			const segmentWidth = width / gridX;
			const segmentHeight = height / gridY;
			const widthHalf = width / 2;
			const heightHalf = height / 2;
			const depthHalf = depth / 2;
			const gridX1 = gridX + 1;
			const gridY1 = gridY + 1;
			const faceStart = vertexCount;

			for (let iy = 0; iy < gridY1; iy++) {
				const y = iy * segmentHeight - heightHalf;
				for (let ix = 0; ix < gridX1; ix++) {
					const x = ix * segmentWidth - widthHalf;
					const vertex = [0, 0, 0];
					vertex[u] = x * uDir;
					vertex[v] = y * vDir;
					vertex[w] = depthHalf;
					positions.push(...vertex);

					const normal = [0, 0, 0];
					normal[w] = depth > 0 ? 1 : -1;
					normals.push(...normal);

					uvs.push(ix / gridX, 1 - iy / gridY);
					vertexCount++;
				}
			}

			for (let iy = 0; iy < gridY; iy++) {
				for (let ix = 0; ix < gridX; ix++) {
					const a = faceStart + ix + gridX1 * iy;
					const b = faceStart + ix + gridX1 * (iy + 1);
					const c = faceStart + (ix + 1) + gridX1 * (iy + 1);
					const d = faceStart + (ix + 1) + gridX1 * iy;
					indices.push(a, b, d);
					indices.push(b, c, d);
				}
			}
		}

		const ws = Math.floor(widthSegments);
		const hs = Math.floor(heightSegments);
		const ds = Math.floor(depthSegments);

		buildPlane(2, 1, 0, -1, -1, depth, height, width, ds, hs); // px
		buildPlane(2, 1, 0, 1, -1, depth, height, -width, ds, hs); // nx
		buildPlane(0, 2, 1, 1, 1, width, depth, height, ws, ds); // py
		buildPlane(0, 2, 1, 1, -1, width, depth, -height, ws, ds); // ny
		buildPlane(0, 1, 2, 1, -1, width, height, depth, ws, hs); // pz
		buildPlane(0, 1, 2, -1, -1, width, height, -depth, ws, hs); // nz

		const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;

		this.setPositions(new Float32Array(positions));
		this.setNormals(new Float32Array(normals));
		this.setUVs(new Float32Array(uvs));
		this.setIndex(new IndexArray(indices));
	}
}

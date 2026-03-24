import { Geometry } from "../Geometry.ts";

interface LathePoint {
	x: number;
	y: number;
}

interface LatheState {
	positions: number[];
	normals: number[];
	uvs: number[];
	indices: number[];
	index: number;
	seg: number;
	phiStart: number;
	inverseSegments: number;
	phiLength: number;
	points: LathePoint[];
}

function buildCap(state: LatheState, pointIndex: number, sign: number): number {
	const {
		positions,
		normals,
		uvs,
		indices,
		seg,
		phiStart,
		inverseSegments,
		phiLength,
		points,
	} = state;
	let { index } = state;

	const centerY = points[pointIndex].y;
	const centerIdx = index;
	positions.push(0, centerY, 0);
	normals.push(0, sign, 0);
	uvs.push(0.5, 0.5);
	index++;

	for (let s = 0; s <= seg; s++) {
		const phi = phiStart + s * inverseSegments * phiLength;
		const cos = Math.cos(phi);
		const sin = Math.sin(phi);
		const r = points[pointIndex].x;
		positions.push(r * sin, centerY, r * cos);
		normals.push(0, sign, 0);
		uvs.push(sin * 0.5 * sign + 0.5, cos * 0.5 + 0.5);
		index++;
	}

	for (let s = 0; s < seg; s++) {
		const first = centerIdx + s + 1;
		const second = centerIdx + s + 2;
		if (sign > 0) {
			indices.push(centerIdx, first, second);
		} else {
			indices.push(second, first, centerIdx);
		}
	}

	return index;
}

function computeNormals(
	points: LathePoint[],
	normals: number[],
	seg: number,
	phiStart: number,
	inverseSegments: number,
	phiLength: number,
): void {
	for (let i = 0; i < points.length; i++) {
		const ip = Math.min(i + 1, points.length - 1);
		const im = Math.max(i - 1, 0);
		const tx = points[ip].x - points[im].x;
		const ty = points[ip].y - points[im].y;
		for (let s = 0; s <= seg; s++) {
			const phi = phiStart + s * inverseSegments * phiLength;
			const sin = Math.sin(phi);
			const cos = Math.cos(phi);
			const nx = ty * cos;
			const ny = -tx;
			const nz = ty * sin;
			const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
			if (len > 0) {
				normals.push(nx / len, ny / len, nz / len);
			} else {
				normals.push(0, 1, 0);
			}
		}
	}
}

function buildIndices(
	grid: number[][],
	indices: number[],
	pointCount: number,
	seg: number,
): void {
	for (let i = 0; i < pointCount - 1; i++) {
		for (let s = 0; s < seg; s++) {
			const a = grid[i][s];
			const b = grid[i + 1][s];
			const c = grid[i + 1][s + 1];
			const d = grid[i][s + 1];
			indices.push(a, d, b);
			indices.push(b, d, c);
		}
	}
}

/** Lathe geometry - revolves an array of Vector2 points around the Y axis. */
export class LatheGeometry extends Geometry {
	declare type: string;
	declare parameters: Record<string, unknown>;

	constructor(
		points: LathePoint[],
		segments = 12,
		phiStart = 0,
		phiLength: number = Math.PI * 2,
	) {
		super();

		this.type = "LatheGeometry";
		this.parameters = { points, segments, phiStart, phiLength };

		const seg = Math.floor(segments);
		const positions: number[] = [];
		const normals: number[] = [];
		const uvs: number[] = [];
		const indices: number[] = [];

		const inversePointCount = 1 / (points.length - 1);
		const inverseSegments = 1 / seg;

		const grid: number[][] = [];
		let index = 0;

		for (let i = 0; i < points.length; i++) {
			const row: number[] = [];
			const t = i * inversePointCount;
			for (let s = 0; s <= seg; s++) {
				const phi = phiStart + s * inverseSegments * phiLength;
				const sin = Math.sin(phi);
				const cos = Math.cos(phi);
				positions.push(points[i].x * sin, points[i].y, points[i].x * cos);
				uvs.push(s * inverseSegments, t);
				row.push(index++);
			}
			grid.push(row);
		}

		computeNormals(points, normals, seg, phiStart, inverseSegments, phiLength);
		buildIndices(grid, indices, points.length, seg);

		const fullRevolution = phiLength >= Math.PI * 2 - 1e-6;

		if (fullRevolution) {
			const state: LatheState = {
				positions,
				normals,
				uvs,
				indices,
				index,
				seg,
				phiStart,
				inverseSegments,
				phiLength,
				points,
			};
			if (points[0].x > 1e-6) {
				index = buildCap(state, 0, -1);
				state.index = index;
			}
			if (points[points.length - 1].x > 1e-6) {
				index = buildCap(state, points.length - 1, 1);
			}
		}

		const IndexArray = index > 65535 ? Uint32Array : Uint16Array;

		this.setPositions(new Float32Array(positions));
		this.setNormals(new Float32Array(normals));
		this.setUVs(new Float32Array(uvs));
		this.setIndex(new IndexArray(indices));
	}
}

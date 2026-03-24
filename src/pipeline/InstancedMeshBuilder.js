import { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { DrawCall } from "./DrawCall.js";
import { TriangleBuffer } from "./TriangleBuffer.js";

const _instLocal = new Matrix4();
const _instWorld = new Matrix4();
const _instMVP = new Matrix4();
const _bsCenter = new Vector3();

const VERT_STRIDE = 4;

/**
 * Builds one DrawCall per visible instance in an InstancedMesh.
 * Extracted from SceneTraversal to keep the hot class monomorphic and
 * avoid V8 deoptimisation of the entire traversal path.
 *
 * @param {{ matrixWorld: Matrix4, geometry: *, material: *, instanceMatrix: Float32Array, instanceColor: Float32Array|undefined, count: number, frustumCulled: boolean, _instProjVerts?: Float32Array[], _instWorldPos?: Float32Array[], _instTriBuf?: TriangleBuffer[], _instWorldNormals?: Float32Array[], _instWorldNormalKey?: Float32Array[] }} node
 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4, position?: { x: number, y: number, z: number } }} camera
 * @param {import("../math/Frustum.js").Frustum} frustum
 * @param {number} width
 * @param {number} height
 * @param {import("./DrawList.js").DrawList} drawList
 * @param {{ hasFog: boolean, fogFar: number }} fogState
 * @param {Function} assembleTrianglesFn
 * @param {Function} buildUvsFn
 * @returns {void}
 */
export function buildInstancedDrawCalls(
	node,
	camera,
	frustum,
	width,
	height,
	drawList,
	fogState,
	assembleTrianglesFn,
	buildUvsFn,
) {
	const count = node.count;
	if (count === 0) return;

	const im = node.instanceMatrix;
	const ic = node.instanceColor;
	const geometry = node.geometry;
	const baseMat = node.material;

	if (
		geometry.boundingSphere === undefined &&
		typeof geometry.computeBoundingSphere === "function"
	) {
		geometry.computeBoundingSphere();
	}
	const bs = geometry.boundingSphere;

	if (!node._instProjVerts) node._instProjVerts = [];
	if (!node._instWorldPos) node._instWorldPos = [];
	if (!node._instTriBuf) node._instTriBuf = [];
	if (!node._instWorldNormals) node._instWorldNormals = [];
	if (!node._instWorldNormalKey) node._instWorldNormalKey = [];

	const posAttr = geometry.getAttribute("position");
	if (!posAttr) return;
	const posArr = posAttr.array;
	const posItemSize = posAttr.itemSize ?? 3;
	const vertCount = posArr.length / posItemSize;

	const normAttr = geometry.getAttribute("normal");
	const nArr = normAttr?.array;
	const nSize = normAttr ? (normAttr.itemSize ?? 3) : 3;
	const nCount = nArr ? nArr.length / nSize : 0;

	const uvs = buildUvsFn({ geometry });

	const index = geometry.index;
	let faceIndices;
	if (index) {
		faceIndices = index.array ?? index;
	} else {
		if (
			!geometry._sequentialIndices ||
			geometry._sequentialIndices.length !== vertCount
		) {
			geometry._sequentialIndices = Uint32Array.from(
				{ length: vertCount },
				(_, i) => i,
			);
		}
		faceIndices = geometry._sequentialIndices;
	}

	const pvNeeded = vertCount * VERT_STRIDE;
	const wpNeeded = vertCount * 3;
	const wnNeeded = nCount * 3;

	const { hasFog, fogFar } = fogState;

	for (let i = 0; i < count; i++) {
		const off = i * 16;
		_instLocal.elements.set(im.subarray(off, off + 16));
		_instWorld.mulMatrices(node.matrixWorld, _instLocal);

		const iwe = _instWorld.elements;

		let lastBsCenterX;
		let lastBsCenterY;
		let lastBsCenterZ;
		let lastBsWorldRadius;

		if (bs && node.frustumCulled) {
			_bsCenter.copy(bs.centre).applyMatrix4(_instWorld);
			const sx = Math.sqrt(iwe[0] * iwe[0] + iwe[1] * iwe[1] + iwe[2] * iwe[2]);
			const sy = Math.sqrt(iwe[4] * iwe[4] + iwe[5] * iwe[5] + iwe[6] * iwe[6]);
			const sz = Math.sqrt(
				iwe[8] * iwe[8] + iwe[9] * iwe[9] + iwe[10] * iwe[10],
			);
			const worldRadius = bs.radius * Math.max(sx, sy, sz);
			if (
				!frustum.intersectsSphere({
					centre: _bsCenter,
					radius: worldRadius,
				})
			) {
				continue;
			}
			lastBsCenterX = _bsCenter.x;
			lastBsCenterY = _bsCenter.y;
			lastBsCenterZ = _bsCenter.z;
			lastBsWorldRadius = worldRadius;
		} else {
			lastBsCenterX = iwe[12];
			lastBsCenterY = iwe[13];
			lastBsCenterZ = iwe[14];
			lastBsWorldRadius = 0;
		}

		if (hasFog && camera.position) {
			const dx = lastBsCenterX - camera.position.x;
			const dy = lastBsCenterY - camera.position.y;
			const dz = lastBsCenterZ - camera.position.z;
			const distSq = dx * dx + dy * dy + dz * dz;
			const fogFarPlusRadius = fogFar + lastBsWorldRadius;
			if (distSq > fogFarPlusRadius * fogFarPlusRadius) {
				continue;
			}
		}

		_instMVP
			.copy(camera.projectionMatrix)
			.mul(camera.matrixWorldInverse)
			.mul(_instWorld);

		let pv = node._instProjVerts[i];
		if (!pv || pv.length !== pvNeeded) {
			pv = new Float32Array(pvNeeded);
			node._instProjVerts[i] = pv;
		}

		let wp = node._instWorldPos[i];
		if (!wp || wp.length !== wpNeeded) {
			wp = new Float32Array(wpNeeded);
			node._instWorldPos[i] = wp;
		}

		const me = _instMVP.elements;
		const mw = iwe;
		for (let v = 0; v < vertCount; v++) {
			const lx = posArr[v * posItemSize];
			const ly = posArr[v * posItemSize + 1];
			const lz = posArr[v * posItemSize + 2];

			const px = me[0] * lx + me[4] * ly + me[8] * lz + me[12];
			const py = me[1] * lx + me[5] * ly + me[9] * lz + me[13];
			const pz = me[2] * lx + me[6] * ly + me[10] * lz + me[14];
			const pw = me[3] * lx + me[7] * ly + me[11] * lz + me[15];
			const invW = 1 / pw;

			const base = v * VERT_STRIDE;
			pv[base] = px * invW;
			pv[base + 1] = py * invW;
			pv[base + 2] = pz * invW;
			pv[base + 3] = pw;

			const wb = v * 3;
			wp[wb] = mw[0] * lx + mw[4] * ly + mw[8] * lz + mw[12];
			wp[wb + 1] = mw[1] * lx + mw[5] * ly + mw[9] * lz + mw[13];
			wp[wb + 2] = mw[2] * lx + mw[6] * ly + mw[10] * lz + mw[14];
		}

		let worldNormals;
		if (nArr && nCount > 0) {
			let wn = node._instWorldNormals[i];
			if (!wn || wn.length !== wnNeeded) {
				wn = new Float32Array(wnNeeded);
				node._instWorldNormals[i] = wn;
			}

			let key = node._instWorldNormalKey[i];
			let cacheHit = false;
			if (key) {
				if (
					key[0] === mw[0] &&
					key[1] === mw[1] &&
					key[2] === mw[2] &&
					key[3] === mw[4] &&
					key[4] === mw[5] &&
					key[5] === mw[6] &&
					key[6] === mw[8] &&
					key[7] === mw[9] &&
					key[8] === mw[10]
				) {
					cacheHit = true;
				} else {
					key[0] = mw[0];
					key[1] = mw[1];
					key[2] = mw[2];
					key[3] = mw[4];
					key[4] = mw[5];
					key[5] = mw[6];
					key[6] = mw[8];
					key[7] = mw[9];
					key[8] = mw[10];
				}
			} else {
				key = new Float32Array([
					mw[0],
					mw[1],
					mw[2],
					mw[4],
					mw[5],
					mw[6],
					mw[8],
					mw[9],
					mw[10],
				]);
				node._instWorldNormalKey[i] = key;
			}

			if (!cacheHit) {
				for (let n = 0; n < nCount; n++) {
					const nx = nArr[n * nSize];
					const ny = nArr[n * nSize + 1];
					const nz = nArr[n * nSize + 2];
					const wx = mw[0] * nx + mw[4] * ny + mw[8] * nz;
					const wy = mw[1] * nx + mw[5] * ny + mw[9] * nz;
					const wz = mw[2] * nx + mw[6] * ny + mw[10] * nz;
					const len = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
					wn[n * 3] = wx / len;
					wn[n * 3 + 1] = wy / len;
					wn[n * 3 + 2] = wz / len;
				}
			}
			worldNormals = wn;
		} else {
			worldNormals = new Float32Array(0);
		}

		let material = baseMat;
		if (ic) {
			const baseColor = baseMat.color;
			if (baseColor) {
				material = Object.create(baseMat);
				material.color = {
					r: baseColor.r * ic[i * 3],
					g: baseColor.g * ic[i * 3 + 1],
					b: baseColor.b * ic[i * 3 + 2],
				};
			}
		}

		let triBuf = node._instTriBuf[i];
		const triCount = Math.floor(faceIndices.length / 3);
		if (!triBuf) {
			triBuf = new TriangleBuffer(triCount || 64);
			node._instTriBuf[i] = triBuf;
		}

		const triangles = assembleTrianglesFn(
			faceIndices,
			pv,
			worldNormals,
			uvs,
			wp,
			width,
			height,
			material,
			{ _triangleBuffer: triBuf },
		);

		const drawCall = new DrawCall(
			/** @type {*} */ (/** @type {unknown} */ (node)),
			material,
		);
		drawCall.centroid.x = lastBsCenterX;
		drawCall.centroid.y = lastBsCenterY;
		drawCall.centroid.z = lastBsCenterZ;
		drawCall.projectedVerts = pv;
		drawCall.vertCount = vertCount;
		drawCall.faceIndices = faceIndices;
		drawCall.worldPositions = wp;
		drawCall.triangles = triangles;
		drawList.add(drawCall);
	}
}

import { LightType, Shading, Side } from "../core/Constants.ts";
import type { Node } from "../core/Node.ts";
import type { Material } from "../materials/Material.ts";
import { Frustum } from "../math/Frustum.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { DrawCall } from "./DrawCall.ts";
import { DrawList } from "./DrawList.ts";
import { buildInstancedDrawCalls } from "./InstancedMeshBuilder.ts";
import { TriangleBuffer } from "./TriangleBuffer.ts";

const _mvp = new Matrix4();
const _vp = new Matrix4();
const _bsCenter = new Vector3();
const _frustum = new Frustum();
const _emptyUvs = new Float32Array(0);

interface Vec3 {
	x: number;
	y: number;
	z: number;
}

interface AttributeLike {
	array: Float32Array;
	itemSize?: number;
}

interface GeometryLike {
	boundingSphere?: { centre: Vector3; radius: number };
	computeBoundingSphere?: () => void;
	getAttribute: (name: string) => AttributeLike | undefined;
	index?: { array: ArrayLike<number> } | ArrayLike<number>;
	_sequentialIndices?: Uint32Array;
	_uvCache?: Float32Array;
}

interface SceneNode {
	type?: string;
	visible: boolean;
	children: SceneNode[];
	geometry?: GeometryLike;
	material?: Material;
	matrixWorld: Matrix4;
	updateMatrixWorld?: (updateParents?: boolean, force?: boolean) => void;
	frustumCulled?: boolean;
	_projectedVerts?: Float32Array;
	_worldPositions?: Float32Array;
	_worldNormalCache?: Float32Array;
	_worldNormalCacheKey?: Float32Array;
	_triangleBuffer?: TriangleBuffer;
	_drawCall?: DrawCall;
	[k: string]: unknown;
}

interface CameraLike {
	matrixWorldInverse: Matrix4;
	projectionMatrix: Matrix4;
	position: Vec3;
	updateMatrixWorld: () => void;
}

interface SceneLike {
	children: SceneNode[];
	visible: boolean;
	fog?:
		| {
				near: number;
				far: number;
				color: { r: number; g: number; b: number };
				lut: Float32Array;
		  }
		| undefined;
	autoUpdate?: boolean;
}

const VERT_STRIDE = 4;

/** Walks the scene graph collecting visible draw calls. */
export class SceneTraversal {
	#fogNear = 0;
	#fogFar = 0;
	#fogLutScale = 0;
	#fogLut: Float32Array | null = null;
	#hasFog = false;
	#autoUpdate = false;

	// Scratch storage set by `#isFrustumCulled` so `#walk` can reuse
	// bounding sphere world center without recomputing it for fog checks.
	#lastBsCenterX = 0;
	#lastBsCenterY = 0;
	#lastBsCenterZ = 0;
	#lastBsWorldRadius = 0;

	#sphereScratch = { centre: _bsCenter, radius: 0 };

	#drawList = new DrawList();
	#sceneHasUpdateMatrixWorld = false;

	traverse(
		scene: SceneLike,
		camera: CameraLike,
		width = 300,
		height = 150,
		timings?: {
			profileTraversal?: boolean;
			travUpdateWorldMs?: number;
			travWalkMs?: number;
			travProjectMs?: number;
			travAssembleMs?: number;
			travDrawCalls?: number;
		},
	): DrawList {
		const perf = timings ? globalThis.performance : undefined;
		const now =
			timings && typeof perf?.now === "function"
				? perf.now.bind(perf)
				: Date.now;
		const profile = !!timings?.profileTraversal;
		let projectMs = 0;
		let assembleMs = 0;

		this.#autoUpdate = scene.autoUpdate !== false;
		const tUpdate0 = timings ? now() : 0;
		camera.updateMatrixWorld();
		if (this.#autoUpdate) {
			const sceneUpdate = (scene as unknown as { updateMatrixWorld?: unknown })
				.updateMatrixWorld;
			this.#sceneHasUpdateMatrixWorld = typeof sceneUpdate === "function";
			if (typeof sceneUpdate === "function") {
				(
					sceneUpdate as (
						updateParents?: boolean,
						updateChildren?: boolean,
					) => void
				).call(scene, true, true);
			}
		} else {
			this.#sceneHasUpdateMatrixWorld = false;
		}
		if (timings) timings.travUpdateWorldMs = now() - tUpdate0;

		const fog = scene.fog;
		this.#hasFog = !!fog;
		this.#fogNear = fog?.near ?? 0;
		this.#fogFar = fog?.far ?? 0;
		this.#fogLut = fog?.lut ?? null;
		this.#fogLutScale =
			fog && fog.far - fog.near > 0 ? 255 / (fog.far - fog.near) : 0;

		_vp.copy(camera.projectionMatrix).mul(camera.matrixWorldInverse);
		_frustum.setFromProjectionMatrix(_vp);

		const drawList = this.#drawList;
		drawList.clear();
		const tWalk0 = timings ? now() : 0;
		this.#walk(
			scene as unknown as SceneNode,
			drawList,
			camera,
			_frustum,
			width,
			height,
			profile
				? {
						now,
						onProject: (dt: number) => {
							projectMs += dt;
						},
						onAssemble: (dt: number) => {
							assembleMs += dt;
						},
					}
				: undefined,
		);
		if (timings) timings.travWalkMs = now() - tWalk0;
		if (timings) timings.travDrawCalls = drawList.calls.length;
		if (timings && profile) {
			timings.travProjectMs = projectMs;
			timings.travAssembleMs = assembleMs;
		}

		return drawList;
	}

	#walk(
		node: SceneNode,
		drawList: DrawList,
		camera: CameraLike,
		frustum: Frustum,
		width: number,
		height: number,
		profiler?:
			| {
					now: () => number;
					onProject: (dt: number) => void;
					onAssemble: (dt: number) => void;
			  }
			| undefined,
	): void {
		if (!node.visible) return;

		if (
			(node.type === "Mesh" || node.type === "Points") &&
			node.geometry &&
			node.material
		) {
			if (
				this.#autoUpdate &&
				!this.#sceneHasUpdateMatrixWorld &&
				node.updateMatrixWorld
			) {
				node.updateMatrixWorld(true, false);
			}
			if (
				!this.#isFrustumCulled(
					node as SceneNode & {
						geometry: GeometryLike;
						matrixWorld: Matrix4;
					},
					frustum,
				)
			) {
				// Cheap bounding-sphere fog check before vertex work.
				if (this.#hasFog && camera.position) {
					const dx = this.#lastBsCenterX - camera.position.x;
					const dy = this.#lastBsCenterY - camera.position.y;
					const dz = this.#lastBsCenterZ - camera.position.z;
					const distSq = dx * dx + dy * dy + dz * dz;
					const fogFarPlusRadius = this.#fogFar + this.#lastBsWorldRadius;
					if (distSq > fogFarPlusRadius * fogFarPlusRadius) {
						for (const child of node.children) {
							this.#walk(
								child,
								drawList,
								camera,
								frustum,
								width,
								height,
								profiler,
							);
						}
						return;
					}
				}

				{
					const dc = this.#buildDrawCall(
						node as SceneNode & {
							matrixWorld: Matrix4;
							geometry: GeometryLike;
							material: Material;
						},
						width,
						height,
						profiler,
					);
					drawList.add(dc);
				}
			}
		} else if (
			node.type === "InstancedMesh" &&
			node.geometry &&
			node.material
		) {
			if (
				this.#autoUpdate &&
				!this.#sceneHasUpdateMatrixWorld &&
				node.updateMatrixWorld
			) {
				node.updateMatrixWorld(true, false);
			}
			buildInstancedDrawCalls(
				node as never,
				camera,
				frustum,
				width,
				height,
				drawList,
				{ hasFog: this.#hasFog, fogFar: this.#fogFar },
				(a, b, c, d, e, f, g, h) =>
					this.#assembleTriangles(a, b, c, d, e, f, g, h),
				(() => {
					const hasTexture = !!(
						node.material as unknown as { map?: { data?: unknown } }
					).map?.data;
					return hasTexture
						? (n: unknown) => this.#buildUvs(n as SceneNode)
						: () => _emptyUvs;
				})(),
			);
		} else if (typeof node.type === "string" && node.type.endsWith("Light")) {
			this.#collectLight(node, drawList);
		}

		for (const child of node.children) {
			this.#walk(child, drawList, camera, frustum, width, height, profiler);
		}
	}

	/**
	 * Returns true if the node is outside the frustum and should be skipped.
	 * As a side-effect, writes the bounding sphere world center and radius into
	 * scratch fields so callers can reuse them for the fog distance check.
	 */
	#isFrustumCulled(
		node: { geometry: GeometryLike; matrixWorld: Matrix4 },
		frustum: Frustum,
	): boolean {
		if (
			node.geometry.boundingSphere === undefined &&
			typeof node.geometry.computeBoundingSphere === "function"
		) {
			node.geometry.computeBoundingSphere();
		}
		const bs = node.geometry.boundingSphere;
		if (!bs) {
			const me = node.matrixWorld.elements;
			this.#lastBsCenterX = me[12];
			this.#lastBsCenterY = me[13];
			this.#lastBsCenterZ = me[14];
			this.#lastBsWorldRadius = 0;
			return false;
		}

		const me = node.matrixWorld.elements;
		const bsCenter = bs.centre;
		let worldCenter: Vector3;
		if (bsCenter.x === 0 && bsCenter.y === 0 && bsCenter.z === 0) {
			_bsCenter.x = me[12];
			_bsCenter.y = me[13];
			_bsCenter.z = me[14];
			worldCenter = _bsCenter;
		} else {
			worldCenter = _bsCenter.copy(bsCenter).applyMatrix4(node.matrixWorld);
		}
		const sx2 = me[0] * me[0] + me[1] * me[1] + me[2] * me[2];
		const sy2 = me[4] * me[4] + me[5] * me[5] + me[6] * me[6];
		const sz2 = me[8] * me[8] + me[9] * me[9] + me[10] * me[10];
		const worldRadius = bs.radius * Math.sqrt(Math.max(sx2, sy2, sz2));

		this.#lastBsCenterX = worldCenter.x;
		this.#lastBsCenterY = worldCenter.y;
		this.#lastBsCenterZ = worldCenter.z;
		this.#lastBsWorldRadius = worldRadius;

		this.#sphereScratch.radius = worldRadius;
		return !frustum.intersectsSphere(this.#sphereScratch);
	}

	#buildDrawCall(
		node: SceneNode & {
			matrixWorld: Matrix4;
			geometry: GeometryLike;
			material: Material;
		},
		width: number,
		height: number,
		profiler?:
			| {
					now: () => number;
					onProject: (dt: number) => void;
					onAssemble: (dt: number) => void;
			  }
			| undefined,
	): DrawCall {
		let drawCall = node._drawCall;
		if (drawCall) {
			drawCall.mesh = node as unknown as Node;
			drawCall.material = node.material;
			drawCall.centroid.x = this.#lastBsCenterX;
			drawCall.centroid.y = this.#lastBsCenterY;
			drawCall.centroid.z = this.#lastBsCenterZ;
		} else {
			drawCall = new DrawCall(
				node as unknown as Node,
				node.material,
				this.#lastBsCenterX,
				this.#lastBsCenterY,
				this.#lastBsCenterZ,
			);
			node._drawCall = drawCall;
		}

		_mvp.copy(_vp).mul(node.matrixWorld);

		if (profiler) {
			const t0 = profiler.now();
			this.#projectVertices(node, drawCall);
			profiler.onProject(profiler.now() - t0);
		} else {
			this.#projectVertices(node, drawCall);
		}

		const index = node.geometry.index;
		if (index) {
			drawCall.faceIndices = ((index as { array: ArrayLike<number> }).array ??
				index) as number[] | Uint16Array | Uint32Array;
		} else {
			if (
				!node.geometry._sequentialIndices ||
				node.geometry._sequentialIndices.length !== drawCall.vertCount
			) {
				node.geometry._sequentialIndices = Uint32Array.from(
					{ length: drawCall.vertCount },
					(_, i) => i,
				);
			}
			drawCall.faceIndices = node.geometry._sequentialIndices;
		}

		if (profiler) {
			const t0 = profiler.now();
			const worldNormals = this.#buildWorldNormals(node);
			const hasTexture = !!(
				node.material as unknown as { map?: { data?: unknown } }
			).map?.data;
			const uvs = hasTexture ? this.#buildUvs(node) : _emptyUvs;
			drawCall.triangles = this.#assembleTriangles(
				drawCall.faceIndices,
				drawCall.projectedVerts,
				worldNormals,
				uvs,
				width,
				height,
				node.material,
				node,
			);
			profiler.onAssemble(profiler.now() - t0);
		} else {
			const worldNormals = this.#buildWorldNormals(node);
			const hasTexture = !!(
				node.material as unknown as { map?: { data?: unknown } }
			).map?.data;
			const uvs = hasTexture ? this.#buildUvs(node) : _emptyUvs;
			drawCall.triangles = this.#assembleTriangles(
				drawCall.faceIndices,
				drawCall.projectedVerts,
				worldNormals,
				uvs,
				width,
				height,
				node.material,
				node,
			);
		}

		return drawCall;
	}

	/**
	 * Projects local-space vertex positions to NDC and world space.
	 */
	#projectVertices(
		node: SceneNode & { matrixWorld: Matrix4; geometry: GeometryLike },
		drawCall: DrawCall,
	): void {
		const posAttr = node.geometry.getAttribute("position");
		if (!posAttr) return;

		const arr = posAttr.array;
		const itemSize = posAttr.itemSize ?? 3;
		const count = arr.length / itemSize;
		const me = _mvp.elements;
		const needed = count * VERT_STRIDE;
		let pv = node._projectedVerts;
		if (!pv || pv.length !== needed) {
			pv = new Float32Array(needed);
			node._projectedVerts = pv;
		}
		drawCall.projectedVerts = pv;
		drawCall.vertCount = count;

		const worldNeeded = count * 3;
		let wp = node._worldPositions;
		if (!wp || wp.length !== worldNeeded) {
			wp = new Float32Array(worldNeeded);
			node._worldPositions = wp;
		}
		drawCall.worldPositions = wp;

		const mw = node.matrixWorld.elements;
		for (let i = 0; i < count; i++) {
			const lx = arr[i * itemSize];
			const ly = arr[i * itemSize + 1];
			const lz = arr[i * itemSize + 2];

			const px = me[0] * lx + me[4] * ly + me[8] * lz + me[12];
			const py = me[1] * lx + me[5] * ly + me[9] * lz + me[13];
			const pz = me[2] * lx + me[6] * ly + me[10] * lz + me[14];
			const pw = me[3] * lx + me[7] * ly + me[11] * lz + me[15];
			const invW = 1 / pw;

			const base = i * VERT_STRIDE;
			pv[base] = px * invW;
			pv[base + 1] = py * invW;
			pv[base + 2] = pz * invW;
			pv[base + 3] = pw;

			const wb = i * 3;
			wp[wb] = mw[0] * lx + mw[4] * ly + mw[8] * lz + mw[12];
			wp[wb + 1] = mw[1] * lx + mw[5] * ly + mw[9] * lz + mw[13];
			wp[wb + 2] = mw[2] * lx + mw[6] * ly + mw[10] * lz + mw[14];
		}
	}

	/**
	 * Caches world normals on the geometry keyed by the 3x3 rotation submatrix.
	 */
	#buildWorldNormals(
		node: SceneNode & { matrixWorld: Matrix4; geometry: GeometryLike },
	): Float32Array {
		const normAttr = node.geometry.getAttribute("normal");
		if (!normAttr) return new Float32Array(0);

		const nArr = normAttr.array;
		const nSize = normAttr.itemSize ?? 3;
		const nCount = nArr.length / nSize;
		const m = node.matrixWorld.elements;

		if (node._worldNormalCache && node._worldNormalCacheKey) {
			const k = node._worldNormalCacheKey;
			if (
				k[0] === m[0] &&
				k[1] === m[1] &&
				k[2] === m[2] &&
				k[3] === m[4] &&
				k[4] === m[5] &&
				k[5] === m[6] &&
				k[6] === m[8] &&
				k[7] === m[9] &&
				k[8] === m[10]
			) {
				return node._worldNormalCache;
			}
			k[0] = m[0];
			k[1] = m[1];
			k[2] = m[2];
			k[3] = m[4];
			k[4] = m[5];
			k[5] = m[6];
			k[6] = m[8];
			k[7] = m[9];
			k[8] = m[10];
		} else {
			node._worldNormalCacheKey = new Float32Array([
				m[0],
				m[1],
				m[2],
				m[4],
				m[5],
				m[6],
				m[8],
				m[9],
				m[10],
			]);
		}

		let result = node._worldNormalCache;
		if (!result || result.length !== nCount * 3) {
			result = new Float32Array(nCount * 3);
			node._worldNormalCache = result;
		}

		for (let i = 0; i < nCount; i++) {
			const nx = nArr[i * nSize];
			const ny = nArr[i * nSize + 1];
			const nz = nArr[i * nSize + 2];
			const wx = m[0] * nx + m[4] * ny + m[8] * nz;
			const wy = m[1] * nx + m[5] * ny + m[9] * nz;
			const wz = m[2] * nx + m[6] * ny + m[10] * nz;
			const len = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
			result[i * 3] = wx / len;
			result[i * 3 + 1] = wy / len;
			result[i * 3 + 2] = wz / len;
		}

		return result;
	}

	/** Caches the UV buffer on the geometry since UVs are intrinsic and never change. */
	#buildUvs(node: SceneNode | { geometry: GeometryLike }): Float32Array {
		const geometry =
			(node as SceneNode).geometry ??
			(node as { geometry: GeometryLike }).geometry;
		if ((geometry as GeometryLike & { _uvCache?: Float32Array })._uvCache)
			return (geometry as GeometryLike & { _uvCache: Float32Array })._uvCache;

		const uvAttr = geometry.getAttribute("uv");
		if (!uvAttr) return new Float32Array(0);

		const arr = uvAttr.array;
		const itemSize = uvAttr.itemSize ?? 2;
		const count = arr.length / itemSize;
		const result = new Float32Array(count * 2);
		for (let i = 0; i < count; i++) {
			result[i * 2] = arr[i * itemSize];
			result[i * 2 + 1] = arr[i * itemSize + 1];
		}
		(geometry as GeometryLike & { _uvCache: Float32Array })._uvCache = result;
		return result;
	}

	#assembleTriangles(
		indices: ArrayLike<number>,
		verts: Float32Array,
		worldNormals: Float32Array,
		uvs: Float32Array,
		width: number,
		height: number,
		material: Material,
		node: { _triangleBuffer?: TriangleBuffer; [k: string]: unknown },
	): TriangleBuffer {
		const triCount = Math.floor(indices.length / 3);
		const side = material.side;
		const isFlatShaded = material.shading === Shading.Flat;
		const hasTexture = !!(material as unknown as { map?: { data?: unknown } })
			.map?.data;

		let buf = node._triangleBuffer;
		if (!buf) {
			buf = new TriangleBuffer(triCount || 64);
			node._triangleBuffer = buf;
		}
		buf.reset();
		buf.ensureCapacity(triCount);

		const halfW = width * 0.5;
		const halfH = height * 0.5;

		const hasFog = this.#hasFog;
		const fogNear = this.#fogNear;
		const fogLutScale = this.#fogLutScale;
		const fogLut = this.#fogLut;
		const wnLen = worldNormals.length;
		const uvLen = uvs.length;

		const screenX = buf.screenX;
		const screenY = buf.screenY;
		const ndcZ = buf.ndcZ;
		const faceNormalX = buf.faceNormalX;
		const faceNormalY = buf.faceNormalY;
		const faceNormalZ = buf.faceNormalZ;
		const vertNormalX = buf.vertNormalX;
		const vertNormalY = buf.vertNormalY;
		const vertNormalZ = buf.vertNormalZ;
		const uvU = buf.uvU;
		const uvV = buf.uvV;
		const fogFactor = buf.fogFactor;
		const vertexIndex = buf.vertexIndex;
		const centroidZ = buf.centroidZ;

		let outLen = 0;
		let maxVi = 0;

		for (let t = 0; t < triCount; t++) {
			const i0 = indices[t * 3];
			const i1 = indices[t * 3 + 1];
			const i2 = indices[t * 3 + 2];

			const b0 = i0 * VERT_STRIDE;
			const b1 = i1 * VERT_STRIDE;
			const b2 = i2 * VERT_STRIDE;

			const w0 = verts[b0 + 3];
			const w1 = verts[b1 + 3];
			const w2 = verts[b2 + 3];

			if (w0 <= 0 || w1 <= 0 || w2 <= 0) continue;

			const x0 = verts[b0];
			const y0 = verts[b0 + 1];
			const x1 = verts[b1];
			const y1 = verts[b1 + 1];
			const x2 = verts[b2];
			const y2 = verts[b2 + 1];

			const sx0 = ((x0 + 1) * halfW + 0.5) | 0;
			const sy0 = ((1 - y0) * halfH + 0.5) | 0;
			const sx1 = ((x1 + 1) * halfW + 0.5) | 0;
			const sy1 = ((1 - y1) * halfH + 0.5) | 0;
			const sx2 = ((x2 + 1) * halfW + 0.5) | 0;
			const sy2 = ((1 - y2) * halfH + 0.5) | 0;

			const cross = (sx1 - sx0) * (sy2 - sy0) - (sy1 - sy0) * (sx2 - sx0);
			if (cross === 0) continue;
			if (side === Side.Front) {
				if (cross > 0) continue;
			} else if (side === Side.Back) {
				if (cross < 0) continue;
			}

			let [ff0, ff1, ff2] = [0, 0, 0];
			if (hasFog && fogLut) {
				const i0f = ((w0 - fogNear) * fogLutScale) | 0;
				const i1f = ((w1 - fogNear) * fogLutScale) | 0;
				const i2f = ((w2 - fogNear) * fogLutScale) | 0;
				ff0 = i0f <= 0 ? 0 : i0f >= 255 ? fogLut[255] : fogLut[i0f];
				ff1 = i1f <= 0 ? 0 : i1f >= 255 ? fogLut[255] : fogLut[i1f];
				ff2 = i2f <= 0 ? 0 : i2f >= 255 ? fogLut[255] : fogLut[i2f];
			}

			let [fnx, fny, fnz] = [0, 1, 0];
			if (isFlatShaded && wnLen > 0) {
				const n0x = worldNormals[i0 * 3];
				const n0y = worldNormals[i0 * 3 + 1];
				const n0z = worldNormals[i0 * 3 + 2];
				const n1x = worldNormals[i1 * 3];
				const n1y = worldNormals[i1 * 3 + 1];
				const n1z = worldNormals[i1 * 3 + 2];
				const n2x = worldNormals[i2 * 3];
				const n2y = worldNormals[i2 * 3 + 1];
				const n2z = worldNormals[i2 * 3 + 2];
				const ax = (n0x + n1x + n2x) / 3;
				const ay = (n0y + n1y + n2y) / 3;
				const az = (n0z + n1z + n2z) / 3;
				const al = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
				[fnx, fny, fnz] = [ax / al, ay / al, az / al];
			}

			const vn0b = i0 * 3;
			const vn0x = wnLen === 0 ? fnx : worldNormals[vn0b];
			const vn0y = wnLen === 0 ? fny : worldNormals[vn0b + 1];
			const vn0z = wnLen === 0 ? fnz : worldNormals[vn0b + 2];
			const vn1b = i1 * 3;
			const vn1x = wnLen === 0 ? fnx : worldNormals[vn1b];
			const vn1y = wnLen === 0 ? fny : worldNormals[vn1b + 1];
			const vn1z = wnLen === 0 ? fnz : worldNormals[vn1b + 2];
			const vn2b = i2 * 3;
			const vn2x = wnLen === 0 ? fnx : worldNormals[vn2b];
			const vn2y = wnLen === 0 ? fny : worldNormals[vn2b + 1];
			const vn2z = wnLen === 0 ? fnz : worldNormals[vn2b + 2];

			const z0 = verts[b0 + 2];
			const z1 = verts[b1 + 2];
			const z2 = verts[b2 + 2];

			const o = outLen;
			const o3 = o * 3;
			screenX[o3] = sx0;
			screenX[o3 + 1] = sx1;
			screenX[o3 + 2] = sx2;
			screenY[o3] = sy0;
			screenY[o3 + 1] = sy1;
			screenY[o3 + 2] = sy2;
			ndcZ[o3] = z0;
			ndcZ[o3 + 1] = z1;
			ndcZ[o3 + 2] = z2;

			faceNormalX[o] = fnx;
			faceNormalY[o] = fny;
			faceNormalZ[o] = fnz;

			vertNormalX[o3] = vn0x;
			vertNormalX[o3 + 1] = vn1x;
			vertNormalX[o3 + 2] = vn2x;
			vertNormalY[o3] = vn0y;
			vertNormalY[o3 + 1] = vn1y;
			vertNormalY[o3 + 2] = vn2y;
			vertNormalZ[o3] = vn0z;
			vertNormalZ[o3 + 1] = vn1z;
			vertNormalZ[o3 + 2] = vn2z;

			if (hasTexture) {
				if (uvLen > 0) {
					const uv0b = i0 * 2;
					const uv1b = i1 * 2;
					const uv2b = i2 * 2;
					uvU[o3] = uvs[uv0b];
					uvV[o3] = uvs[uv0b + 1];
					uvU[o3 + 1] = uvs[uv1b];
					uvV[o3 + 1] = uvs[uv1b + 1];
					uvU[o3 + 2] = uvs[uv2b];
					uvV[o3 + 2] = uvs[uv2b + 1];
				} else {
					uvU[o3] = 0;
					uvV[o3] = 0;
					uvU[o3 + 1] = 0;
					uvV[o3 + 1] = 0;
					uvU[o3 + 2] = 0;
					uvV[o3 + 2] = 0;
				}
			}

			if (hasFog) {
				fogFactor[o3] = fogLut ? ff0 : 0;
				fogFactor[o3 + 1] = fogLut ? ff1 : 0;
				fogFactor[o3 + 2] = fogLut ? ff2 : 0;
			}

			vertexIndex[o3] = i0;
			vertexIndex[o3 + 1] = i1;
			vertexIndex[o3 + 2] = i2;
			if (i0 > maxVi) maxVi = i0;
			if (i1 > maxVi) maxVi = i1;
			if (i2 > maxVi) maxVi = i2;

			centroidZ[o] = (z0 + z1 + z2) * 0.3333333333333333;
			outLen++;
		}

		buf.length = outLen;
		buf.maxVertexIndex = maxVi;
		return buf;
	}

	#collectLight(light: SceneNode, drawList: DrawList): void {
		if (light.type === "AmbientLight") {
			drawList.lights.push({
				type: "ambient",
				lightType: LightType.Ambient,
				color: light["color"],
				intensity: light["intensity"],
			});
			return;
		}

		if (light.type === "HemisphereLight") {
			const pos = light["position"] as Vec3;
			const len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 1;
			drawList.lights.push({
				type: "hemisphere",
				lightType: LightType.Hemisphere,
				skyColor: light["color"],
				groundColor: light["groundColor"],
				direction: { x: pos.x / len, y: pos.y / len, z: pos.z / len },
				intensity: light["intensity"],
			});
			return;
		}

		if (light.type === "SpotLight") {
			drawList.lights.push(this.#buildSpotLightEntry(light));
			return;
		}

		if (light.type === "PointLight") {
			const pos = light["position"] as Vec3;
			drawList.lights.push({
				type: "point",
				lightType: LightType.Point,
				position: { x: pos.x, y: pos.y, z: pos.z },
				color: light["color"],
				intensity: light["intensity"],
				distance: (light["distance"] as number) ?? 0,
				decay: (light["decay"] as number) ?? 2,
			});
			return;
		}

		if (
			!light["position"] ||
			light["color"] === undefined ||
			light["intensity"] === undefined
		) {
			return;
		}
		const pos = light["position"] as Vec3;
		let ddx: number;
		let ddy: number;
		let ddz: number;
		if (light["target"]) {
			const target = light["target"] as SceneNode;
			const tme = target.matrixWorld?.elements;
			const lme = light.matrixWorld?.elements;
			const twx = tme
				? tme[12]
				: ((target["position"] as Vec3 | undefined)?.x ?? 0);
			const twy = tme
				? tme[13]
				: ((target["position"] as Vec3 | undefined)?.y ?? 0);
			const twz = tme
				? tme[14]
				: ((target["position"] as Vec3 | undefined)?.z ?? 0);
			const lwx = lme ? lme[12] : pos.x;
			const lwy = lme ? lme[13] : pos.y;
			const lwz = lme ? lme[14] : pos.z;
			ddx = twx - lwx;
			ddy = twy - lwy;
			ddz = twz - lwz;
		} else {
			[ddx, ddy, ddz] = [-pos.x, -pos.y, -pos.z];
		}
		const len = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) || 1;
		drawList.lights.push({
			type: "directional",
			lightType: LightType.Directional,
			direction: { x: ddx / len, y: ddy / len, z: ddz / len },
			color: light["color"],
			intensity: light["intensity"],
		});
	}

	#buildSpotLightEntry(light: SceneNode): Record<string, unknown> {
		const pos = light["position"] as Vec3;
		const me = light.matrixWorld?.elements;
		let wdx: number;
		let wdy: number;
		let wdz: number;
		if (light["target"]) {
			const target = light["target"] as SceneNode;
			const tme = target.matrixWorld?.elements;
			const twx = tme
				? tme[12]
				: ((target["position"] as Vec3 | undefined)?.x ?? 0);
			const twy = tme
				? tme[13]
				: ((target["position"] as Vec3 | undefined)?.y ?? 0);
			const twz = tme
				? tme[14]
				: ((target["position"] as Vec3 | undefined)?.z ?? 0);
			const lwx = me ? me[12] : pos.x;
			const lwy = me ? me[13] : pos.y;
			const lwz = me ? me[14] : pos.z;
			wdx = twx - lwx;
			wdy = twy - lwy;
			wdz = twz - lwz;
		} else {
			const dir = light["direction"] as Vec3 | undefined;
			const dx = dir?.x ?? 0;
			const dy = dir?.y ?? -1;
			const dz = dir?.z ?? 0;
			if (me) {
				wdx = me[0] * dx + me[4] * dy + me[8] * dz;
				wdy = me[1] * dx + me[5] * dy + me[9] * dz;
				wdz = me[2] * dx + me[6] * dy + me[10] * dz;
			} else {
				[wdx, wdy, wdz] = [dx, dy, dz];
			}
		}
		const dirLen = Math.sqrt(wdx * wdx + wdy * wdy + wdz * wdz) || 1;
		return {
			type: "spot",
			lightType: LightType.Spot,
			position: { x: pos.x, y: pos.y, z: pos.z },
			direction: { x: wdx / dirLen, y: wdy / dirLen, z: wdz / dirLen },
			color: light["color"],
			intensity: light["intensity"],
			angle: light["angle"],
			penumbra: (light["penumbra"] as number) ?? 0,
			distance: (light["distance"] as number) ?? 0,
			decay: (light["decay"] as number) ?? 2,
		};
	}
}

import { Ray } from "../math/Ray.js";
import { Vector3 } from "../math/Vector3.js";
import { Layers } from "./Layers.js";

const _v0 = new Vector3();
const _v1 = new Vector3();
const _v2 = new Vector3();
const _intersectPoint = new Vector3();

/**
 * @typedef {{ elements: ArrayLike<number> }} MatrixLike
 * @typedef {{ getX: (i: number) => number, getY: (i: number) => number, getZ: (i: number) => number, count: number }} PositionAttribute
 * @typedef {{ getAttribute?: (name: string) => PositionAttribute|undefined, index?: ArrayLike<number>|{ array: ArrayLike<number> }|undefined }} RaycastGeometry
 * @typedef {{ visible: boolean, layers: Layers, type?: string, geometry?: RaycastGeometry, matrixWorld: MatrixLike, children?: SceneObject[] }} SceneObject
 * @typedef {{ distance: number, point: Vector3, face: { a: number, b: number, c: number, normal: Vector3|undefined }, object: SceneObject }} Intersection
 */

export class Raycaster {
	/** @type {Ray} */
	ray;

	/** @type {number} */
	near;

	/** @type {number} */
	far;

	/** @type {{ type: string, matrixWorld: MatrixLike, projectionMatrixInverse: MatrixLike }|undefined} */
	camera;

	/** @type {Layers} */
	layers;

	/**
	 * @param {Vector3} [origin]
	 * @param {Vector3} [direction]
	 * @param {number} [near]
	 * @param {number} [far]
	 */
	constructor(
		origin = new Vector3(),
		direction = new Vector3(0, 0, -1),
		near = 0,
		far = Number.POSITIVE_INFINITY,
	) {
		this.ray = new Ray(origin, direction);
		this.near = near;
		this.far = far;
		this.camera = undefined;
		this.layers = new Layers();
	}

	/**
	 * @param {Vector3} origin
	 * @param {Vector3} direction
	 * @returns {this}
	 */
	set(origin, direction) {
		this.ray.set(origin, direction);
		return this;
	}

	/**
	 * Sets the ray from a camera and normalized device coordinates.
	 * @param {{ x: number, y: number }} coords - NDC coords in [-1, 1]
	 * @param {{ type: string, matrixWorld: MatrixLike, projectionMatrixInverse: MatrixLike, isOrthographic?: boolean }} camera
	 * @returns {this}
	 */
	setFromCamera(coords, camera) {
		this.camera = camera;
		if (camera.type === "PerspectiveCamera") {
			this.ray.origin.setFromMatrixPosition(camera.matrixWorld);
			this.ray.direction
				.set(coords.x, coords.y, 0.5)
				.applyMatrix4(camera.projectionMatrixInverse)
				.applyMatrix4(camera.matrixWorld)
				.sub(this.ray.origin)
				.normalize();
		} else {
			// Orthographic
			this.ray.origin
				.set(coords.x, coords.y, -1)
				.applyMatrix4(camera.projectionMatrixInverse)
				.applyMatrix4(camera.matrixWorld);
			this.ray.direction
				.set(0, 0, -1)
				.applyMatrix4(camera.matrixWorld)
				.sub(_v0.setFromMatrixPosition(camera.matrixWorld))
				.normalize();
		}
		return this;
	}

	/**
	 * @param {SceneObject} object
	 * @param {boolean} [recursive]
	 * @param {Intersection[]} [intersects]
	 * @returns {Intersection[]}
	 */
	intersectObject(object, recursive = false, intersects = []) {
		_intersectObject(object, this, intersects, recursive);
		intersects.sort(_ascSort);
		return intersects;
	}

	/**
	 * @param {SceneObject[]} objects
	 * @param {boolean} [recursive]
	 * @param {Intersection[]} [intersects]
	 * @returns {Intersection[]}
	 */
	intersectObjects(objects, recursive = false, intersects = []) {
		for (const object of objects) {
			_intersectObject(object, this, intersects, recursive);
		}
		intersects.sort(_ascSort);
		return intersects;
	}
}

/**
 * @param {{ distance: number }} a
 * @param {{ distance: number }} b
 * @returns {number}
 */
function _ascSort(a, b) {
	return a.distance - b.distance;
}

/**
 * @param {SceneObject} object
 * @param {Raycaster} raycaster
 * @param {Intersection[]} intersects
 * @param {boolean} recursive
 */
function _intersectObject(object, raycaster, intersects, recursive) {
	if (!object.visible) return;
	if (!raycaster.layers.test(object.layers)) return;

	if (object.type === "Mesh" && object.geometry) {
		_intersectMesh(object, object.geometry, raycaster, intersects);
	}

	if (recursive && object.children) {
		for (const child of object.children) {
			_intersectObject(child, raycaster, intersects, recursive);
		}
	}
}

/**
 * Normalize index to `{ array }` form. Geometry.index may return a raw typed
 * array or an object with an `.array` property.
 * @param {ArrayLike<number>|{ array: ArrayLike<number> }|undefined} raw
 * @returns {{ array: ArrayLike<number> }|undefined}
 */
function _normalizeIndex(raw) {
	if (!raw) return undefined;
	if ("array" in raw) return /** @type {{ array: ArrayLike<number> }} */ (raw);
	return { array: raw };
}

/**
 * @param {SceneObject} object
 * @param {RaycastGeometry} geometry
 * @param {Raycaster} raycaster
 * @param {Intersection[]} intersects
 */
function _intersectMesh(object, geometry, raycaster, intersects) {
	const position = geometry.getAttribute?.("position");
	if (!position) return;

	const index = _normalizeIndex(geometry.index);
	const matrixWorld = object.matrixWorld;
	const rayLocal = raycaster.ray
		.clone()
		.applyMatrix4(_invertMatrix4(matrixWorld));

	if (index) {
		_intersectIndexed(
			rayLocal,
			raycaster,
			position,
			index,
			matrixWorld,
			object,
			intersects,
		);
	} else {
		_intersectNonIndexed(
			rayLocal,
			raycaster,
			position,
			matrixWorld,
			object,
			intersects,
		);
	}
}

/**
 * @param {Ray} rayLocal
 * @param {Raycaster} raycaster
 * @param {{ getX: (i: number) => number, getY: (i: number) => number, getZ: (i: number) => number }} position
 * @param {{ array: ArrayLike<number> }} index
 * @param {MatrixLike} matrixWorld
 * @param {SceneObject} object
 * @param {Intersection[]} intersects
 */
function _intersectIndexed(
	rayLocal,
	raycaster,
	position,
	index,
	matrixWorld,
	object,
	intersects,
) {
	const indices = index.array;
	for (let i = 0, l = indices.length; i < l; i += 3) {
		const a = indices[i];
		const b = indices[i + 1];
		const c = indices[i + 2];

		_v0.set(position.getX(a), position.getY(a), position.getZ(a));
		_v1.set(position.getX(b), position.getY(b), position.getZ(b));
		_v2.set(position.getX(c), position.getY(c), position.getZ(c));

		const point = rayLocal.intersectTriangle(
			_v0,
			_v1,
			_v2,
			false,
			_intersectPoint,
		);
		if (point === undefined) continue;

		point.applyMatrix4(matrixWorld);
		const distance = raycaster.ray.origin.distanceTo(point);
		if (distance < raycaster.near || distance > raycaster.far) continue;

		const e1x = _v1.x - _v0.x;
		const e1y = _v1.y - _v0.y;
		const e1z = _v1.z - _v0.z;
		const e2x = _v2.x - _v0.x;
		const e2y = _v2.y - _v0.y;
		const e2z = _v2.z - _v0.z;
		const normal = new Vector3(
			e1y * e2z - e1z * e2y,
			e1z * e2x - e1x * e2z,
			e1x * e2y - e1y * e2x,
		).normalize();
		intersects.push({
			distance,
			point: point.clone(),
			face: { a, b, c, normal: normal.clone() },
			object,
		});
	}
}

/**
 * @param {Ray} rayLocal
 * @param {Raycaster} raycaster
 * @param {{ getX: (i: number) => number, getY: (i: number) => number, getZ: (i: number) => number, count: number }} position
 * @param {MatrixLike} matrixWorld
 * @param {SceneObject} object
 * @param {Intersection[]} intersects
 */
function _intersectNonIndexed(
	rayLocal,
	raycaster,
	position,
	matrixWorld,
	object,
	intersects,
) {
	const count = position.count;
	for (let i = 0; i < count; i += 3) {
		_v0.set(position.getX(i), position.getY(i), position.getZ(i));
		_v1.set(position.getX(i + 1), position.getY(i + 1), position.getZ(i + 1));
		_v2.set(position.getX(i + 2), position.getY(i + 2), position.getZ(i + 2));

		const point = rayLocal.intersectTriangle(
			_v0,
			_v1,
			_v2,
			false,
			_intersectPoint,
		);
		if (point === undefined) continue;

		point.applyMatrix4(matrixWorld);
		const distance = raycaster.ray.origin.distanceTo(point);
		if (distance < raycaster.near || distance > raycaster.far) continue;

		intersects.push({
			distance,
			point: point.clone(),
			face: { a: i, b: i + 1, c: i + 2, normal: undefined },
			object,
		});
	}
}

/**
 * Inverts a Matrix4 in place (returns a new object with inverted elements).
 * @param {MatrixLike} m
 * @returns {MatrixLike}
 */
function _invertMatrix4(m) {
	const te = m.elements;
	const n11 = te[0];
	const n21 = te[1];
	const n31 = te[2];
	const n41 = te[3];
	const n12 = te[4];
	const n22 = te[5];
	const n32 = te[6];
	const n42 = te[7];
	const n13 = te[8];
	const n23 = te[9];
	const n33 = te[10];
	const n43 = te[11];
	const n14 = te[12];
	const n24 = te[13];
	const n34 = te[14];
	const n44 = te[15];

	const t11 =
		n23 * n34 * n42 -
		n24 * n33 * n42 +
		n24 * n32 * n43 -
		n22 * n34 * n43 -
		n23 * n32 * n44 +
		n22 * n33 * n44;
	const t12 =
		n14 * n33 * n42 -
		n13 * n34 * n42 -
		n14 * n32 * n43 +
		n12 * n34 * n43 +
		n13 * n32 * n44 -
		n12 * n33 * n44;
	const t13 =
		n13 * n24 * n42 -
		n14 * n23 * n42 +
		n14 * n22 * n43 -
		n12 * n24 * n43 -
		n13 * n22 * n44 +
		n12 * n23 * n44;
	const t14 =
		n14 * n23 * n32 -
		n13 * n24 * n32 -
		n14 * n22 * n33 +
		n12 * n24 * n33 +
		n13 * n22 * n34 -
		n12 * n23 * n34;

	const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
	if (det === 0) return m;

	const detInv = 1 / det;
	const result = new Float32Array(16);

	result[0] = t11 * detInv;
	result[1] =
		(n24 * n33 * n41 -
			n23 * n34 * n41 -
			n24 * n31 * n43 +
			n21 * n34 * n43 +
			n23 * n31 * n44 -
			n21 * n33 * n44) *
		detInv;
	result[2] =
		(n22 * n34 * n41 -
			n24 * n32 * n41 +
			n24 * n31 * n42 -
			n21 * n34 * n42 -
			n22 * n31 * n44 +
			n21 * n32 * n44) *
		detInv;
	result[3] =
		(n23 * n32 * n41 -
			n22 * n33 * n41 -
			n23 * n31 * n42 +
			n21 * n33 * n42 +
			n22 * n31 * n43 -
			n21 * n32 * n43) *
		detInv;
	result[4] = t12 * detInv;
	result[5] =
		(n13 * n34 * n41 -
			n14 * n33 * n41 +
			n14 * n31 * n43 -
			n11 * n34 * n43 -
			n13 * n31 * n44 +
			n11 * n33 * n44) *
		detInv;
	result[6] =
		(n14 * n32 * n41 -
			n12 * n34 * n41 -
			n14 * n31 * n42 +
			n11 * n34 * n42 +
			n12 * n31 * n44 -
			n11 * n32 * n44) *
		detInv;
	result[7] =
		(n12 * n33 * n41 -
			n13 * n32 * n41 +
			n13 * n31 * n42 -
			n11 * n33 * n42 -
			n12 * n31 * n43 +
			n11 * n32 * n43) *
		detInv;
	result[8] = t13 * detInv;
	result[9] =
		(n14 * n23 * n41 -
			n13 * n24 * n41 -
			n14 * n21 * n43 +
			n11 * n24 * n43 +
			n13 * n21 * n44 -
			n11 * n23 * n44) *
		detInv;
	result[10] =
		(n12 * n24 * n41 -
			n14 * n22 * n41 +
			n14 * n21 * n42 -
			n11 * n24 * n42 -
			n12 * n21 * n44 +
			n11 * n22 * n44) *
		detInv;
	result[11] =
		(n13 * n22 * n41 -
			n12 * n23 * n41 -
			n13 * n21 * n42 +
			n11 * n23 * n42 +
			n12 * n21 * n43 -
			n11 * n22 * n43) *
		detInv;
	result[12] = t14 * detInv;
	result[13] =
		(n13 * n24 * n31 -
			n14 * n23 * n31 +
			n14 * n21 * n33 -
			n11 * n24 * n33 -
			n13 * n21 * n34 +
			n11 * n23 * n34) *
		detInv;
	result[14] =
		(n14 * n22 * n31 -
			n12 * n24 * n31 -
			n14 * n21 * n32 +
			n11 * n24 * n32 +
			n12 * n21 * n34 -
			n11 * n22 * n34) *
		detInv;
	result[15] =
		(n12 * n23 * n31 -
			n13 * n22 * n31 +
			n13 * n21 * n32 -
			n11 * n23 * n32 -
			n12 * n21 * n33 +
			n11 * n22 * n33) *
		detInv;

	return { elements: result };
}

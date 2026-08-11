import { Box3 } from "../math/Box3.ts";
import { Matrix3 } from "../math/Matrix3.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import type { Quaternion } from "../math/Quaternion.ts";
import { Sphere } from "../math/Sphere.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
	Attribute,
	registerAttributeUpdateInvalidator,
	unregisterAttributeUpdateInvalidator,
} from "./Attribute.ts";
import { invalidateGeometryCaches } from "./_geometryCache.ts";
import {
	buildGeometryData,
	computeBoundingSphereData,
	computeTangentsData,
	computeVertexNormalsData,
	expandAttribute,
	mergeAttributeData,
	mergeVerticesData,
} from "./_geometryHelpers.ts";
export {
	registerGeometryCacheInvalidator,
	unregisterGeometryCacheInvalidator,
} from "./_geometryCache.ts";

let _geometryId = 0;

const _point = new Vector3();
const _offset = new Vector3();
const _tangent = new Vector3();
const _normal = new Vector3();
const _matrix = new Matrix4();
const _normalMatrix = new Matrix3();
const _origin = new Vector3();
const _up = new Vector3(0, 1, 0);

/** CPU vertex-data container for positions, normals, UVs, colors, and indices. */
export class Geometry {
	/** Stable numeric identifier assigned when the geometry is constructed. */
	readonly id: number = _geometryId++;
	/** Optional channel name included in serialized output. */
	name: string = "";
	/** Serialization discriminator for this runtime type. */
	type: string = "Geometry";
	/** Primitive-construction parameters retained for serialization. */
	parameters: Record<string, unknown> = {};
	/** Draw-range interval in index or sequential-vertex units. */
	drawRange: { start: number; count: number } = {
		start: 0,
		count: Number.POSITIVE_INFINITY,
	};
	/** Per-channel morph target arrays, or `undefined` when no morph targets exist. */
	morphAttributes: Record<string, Attribute[]> | undefined = undefined;
	/** Whether morph target positions are relative to the base attribute. */
	morphTargetsRelative = false;
	/** Application-specific metadata retained through serialization. */
	userData: Record<string, unknown> = {};
	readonly #attributes = new Map<string, Attribute>();
	#index: Uint16Array | Uint32Array | undefined = undefined;
	#publishingInternalAttributeUpdate: boolean = false;
	readonly #invalidateAttributeCaches = (): void => {
		if (this.#publishingInternalAttributeUpdate) return;
		this.boundingBox = undefined;
		this.boundingSphere = undefined;
		this.#clearUvCache();
		invalidateGeometryCaches(this);
	};
	/** Cached local-space axis-aligned bounds, or `undefined` until computed. */
	boundingBox: Box3 | undefined = undefined;
	/** Cached local-space bounding sphere, or `undefined` until computed. */
	boundingSphere: Sphere | undefined = undefined;

	/** Replaces the position channel from packed xyz values. */
	setPositions(array: Float32Array | number[]): this {
		const data =
			array instanceof Float32Array ? array : new Float32Array(array);
		this.#replaceAttribute("position", new Attribute(data, 3));
		this.#invalidateDerivedData(true, false);
		return this;
	}

	/** Replaces the position channel from Vector2-like or Vector3-like points. */
	setFromPoints(points: Array<{ x: number; y: number; z?: number }>): this {
		const positions = new Array<number>(points.length * 3);
		for (let index = 0; index < points.length; index++) {
			const point = points[index];
			const offset = index * 3;
			positions[offset] = point.x;
			positions[offset + 1] = point.y;
			positions[offset + 2] = point.z ?? 0;
		}
		this.setPositions(positions);
		invalidateGeometryCaches(this);
		return this;
	}

	/** Replaces the UV channel from packed coordinate pairs. */
	setUVs(array: Float32Array | number[]): this {
		const data =
			array instanceof Float32Array ? array : new Float32Array(array);
		this.#replaceAttribute("uv", new Attribute(data, 2));
		this.#invalidateDerivedData(false, true);
		return this;
	}

	/** Replaces the per-vertex RGB color channel used by baked shading. */
	setColors(array: Float32Array | number[]): this {
		const data =
			array instanceof Float32Array ? array : new Float32Array(array);
		this.#replaceAttribute("color", new Attribute(data, 3));
		return this;
	}

	/** Replaces the normal channel from packed xyz vectors. */
	setNormals(array: Float32Array | number[]): this {
		const data =
			array instanceof Float32Array ? array : new Float32Array(array);
		this.#replaceAttribute("normal", new Attribute(data, 3));
		invalidateGeometryCaches(this);
		return this;
	}

	/** Replaces the tangent channel from packed xyzw vectors. */
	setTangents(array: Float32Array | number[]): this {
		const data =
			array instanceof Float32Array ? array : new Float32Array(array);
		this.#replaceAttribute("tangent", new Attribute(data, 4));
		return this;
	}

	/** Assigns or clears the triangle index buffer. */
	set index(array: Uint16Array | Uint32Array | number[] | undefined) {
		this.#clearSequentialIndices();
		if (array === undefined) {
			this.#index = undefined;
			return;
		}
		if (array instanceof Uint16Array || array instanceof Uint32Array) {
			this.#index = array;
		} else {
			this.#index =
				array.length > 65535 ? new Uint32Array(array) : new Uint16Array(array);
		}
	}

	/** Returns the named vertex channel, if present. */
	getAttribute(name: string): Attribute | undefined {
		return this.#attributes.get(name);
	}

	/** Returns whether a named vertex channel is present. */
	hasAttribute(name: string): boolean {
		return this.getAttribute(name) !== undefined;
	}

	/** Installs or replaces a named vertex channel. */
	setAttribute(name: string, attribute: Attribute): this {
		this.#replaceAttribute(name, attribute);
		this.#invalidateDerivedData(name === "position", name === "uv");
		if (name === "normal") invalidateGeometryCaches(this);
		return this;
	}

	/** Removes a named vertex channel and invalidates dependent caches. */
	deleteAttribute(name: string): boolean {
		const attribute = this.#attributes.get(name);
		const deleted = this.#attributes.delete(name);
		if (deleted && attribute) {
			unregisterAttributeUpdateInvalidator(
				attribute,
				this.#invalidateAttributeCaches,
			);
			this.#invalidateDerivedData(name === "position", name === "uv");
			if (name === "normal") invalidateGeometryCaches(this);
		}
		return deleted;
	}

	/** Optional triangle index buffer; `undefined` selects sequential vertices. */
	get index(): Uint16Array | Uint32Array | undefined {
		return this.#index;
	}

	/** Sets the visible index or sequential-vertex interval for traversal. */
	setDrawRange(start: number, count: number): this {
		this.drawRange.start = start;
		this.drawRange.count = count;
		return this;
	}

	/** Read-only view of the named vertex channels. */
	get attributes(): ReadonlyMap<string, Attribute> {
		return this.#attributes;
	}

	/** Computes per-face normals and writes them to the normal channel. */
	computeVertexNormals(): this {
		const posAttr = this.#attributes.get("position");
		if (!posAttr) return this;
		const normals = computeVertexNormalsData(posAttr.array, this.#index);
		const normal = new Attribute(normals, 3);
		this.#publishInternalUpdate(normal);
		this.#replaceAttribute("normal", normal);
		invalidateGeometryCaches(this);
		return this;
	}

	/** Normalizes each existing vertex normal while preserving finite zero normals. */
	normalizeNormals(): this {
		const normal = this.#attributes.get("normal");
		if (!normal || normal.itemSize < 3) return this;

		for (let index = 0; index < normal.count; index++) {
			_normal.set(normal.getX(index), normal.getY(index), normal.getZ(index));
			_normal.normalize();
			normal.setXYZ(index, _normal.x, _normal.y, _normal.z);
		}

		this.#publishInternalUpdate(normal);
		invalidateGeometryCaches(this);
		return this;
	}

	/** Computes per-vertex UV tangents and handedness for CPU helper geometry. */
	computeTangents(): this {
		const position = this.#attributes.get("position");
		const normal = this.#attributes.get("normal");
		const uv = this.#attributes.get("uv");
		if (!(position && normal && uv)) return this;
		const tangent = computeTangentsData(position, normal, uv, this.#index);
		if (!tangent) return this;
		const attribute = new Attribute(tangent, 4);
		this.#publishInternalUpdate(attribute);
		this.#replaceAttribute("tangent", attribute);
		return this;
	}

	/** Computes an axis-aligned bounding box from the position attribute. */
	computeBoundingBox(): this {
		const box = this.boundingBox ?? new Box3();
		const position = this.#attributes.get("position");
		box.makeEmpty();

		if (position) {
			const itemSize = position.itemSize;
			for (let index = 0; index < position.count; index++) {
				_point.set(
					itemSize > 0 ? position.getComponent(index, 0) : 0,
					itemSize > 1 ? position.getComponent(index, 1) : 0,
					itemSize > 2 ? position.getComponent(index, 2) : 0,
				);
				box.expandByPoint(_point);
			}
		}

		this.boundingBox = box;
		return this;
	}

	/** Translates all position vertices and prepared bounds in place. */
	translate(x: number, y: number, z: number): this {
		const position = this.#attributes.get("position");
		if (position && position.itemSize >= 3) {
			for (let index = 0; index < position.count; index++) {
				position.setXYZ(
					index,
					position.getX(index) + x,
					position.getY(index) + y,
					position.getZ(index) + z,
				);
			}
			this.#publishInternalUpdate(position);
		}

		_offset.set(x, y, z);
		this.boundingBox?.translate(_offset);
		this.boundingSphere?.translate(_offset);
		return this;
	}

	/** Centers position vertices around the origin using the prepared bounds. */
	center(): this {
		if (!this.boundingBox) this.computeBoundingBox();
		const box = this.boundingBox;
		if (!box || box.isEmpty) return this;

		box.getCenter(_point);
		return this.translate(-_point.x, -_point.y, -_point.z);
	}

	/** Applies a transform once and invalidates only meshes sharing this geometry. */
	applyMatrix4(matrix: Matrix4): this {
		const normal = this.#attributes.get("normal");
		const tangent = this.#attributes.get("tangent");
		if (normal) _normalMatrix.getNormalMatrix(matrix);

		const position = this.#attributes.get("position");
		if (position) {
			position.applyMatrix4(matrix);
			this.#publishInternalUpdate(position);
		}

		if (normal) {
			normal.applyNormalMatrix(_normalMatrix);
			this.#publishInternalUpdate(normal);
			invalidateGeometryCaches(this);
		}

		if (tangent && tangent.itemSize >= 3) {
			for (let index = 0; index < tangent.count; index++) {
				_tangent
					.set(tangent.getX(index), tangent.getY(index), tangent.getZ(index))
					.transformDirection(matrix);
				if (tangent.itemSize >= 4) {
					tangent.setXYZW(
						index,
						_tangent.x,
						_tangent.y,
						_tangent.z,
						tangent.getW(index),
					);
				} else {
					tangent.setXYZ(index, _tangent.x, _tangent.y, _tangent.z);
				}
			}
			this.#publishInternalUpdate(tangent);
		}

		this.boundingBox?.applyMatrix4(matrix);
		this.boundingSphere?.applyMatrix4(matrix);
		return this;
	}

	/** Rotates all position and normal channels by a quaternion. */
	applyQuaternion(quaternion: Quaternion): this {
		_matrix.makeRotationFromQuaternion(quaternion);
		return this.applyMatrix4(_matrix);
	}

	/** Rotates all position and normal channels around the x axis. */
	rotateX(angle: number): this {
		_matrix.makeRotationX(angle);
		return this.applyMatrix4(_matrix);
	}

	/** Rotates all position and normal channels around the y axis. */
	rotateY(angle: number): this {
		_matrix.makeRotationY(angle);
		return this.applyMatrix4(_matrix);
	}

	/** Rotates all position and normal channels around the z axis. */
	rotateZ(angle: number): this {
		_matrix.makeRotationZ(angle);
		return this.applyMatrix4(_matrix);
	}

	/** Scales all position and normal channels by the supplied factors. */
	scale(x: number, y: number, z: number): this {
		_matrix.makeScale(x, y, z);
		return this.applyMatrix4(_matrix);
	}

	/** Copies all geometry metadata, bounds, indices, and attributes. */
	copy(source: Geometry): this {
		if (source === this) return this;

		this.name = source.name;
		this.type = source.type;
		this.parameters = { ...source.parameters };
		this.#clearAttributes();
		for (const [name, attribute] of source.#attributes) {
			this.#replaceAttribute(name, attribute.clone());
		}
		this.#index = source.#index?.slice() as
			| Uint16Array
			| Uint32Array
			| undefined;
		this.drawRange = { ...source.drawRange };
		this.boundingBox = source.boundingBox?.clone();
		this.boundingSphere = source.boundingSphere?.clone();
		this.#clearSequentialIndices();
		this.#clearUvCache();
		invalidateGeometryCaches(this);
		return this;
	}

	/** Returns a deep copy with a fresh geometry id. */
	clone(): Geometry {
		return new Geometry().copy(this);
	}

	/** Expands indexed attributes into a sequential, non-indexed geometry. */
	toNonIndexed(): Geometry {
		const index = this.#index;
		if (!index) return this.clone();

		const result = new Geometry();
		result.name = this.name;
		result.type = this.type;
		result.parameters = { ...this.parameters };

		for (const [name, attribute] of this.#attributes) {
			result.#replaceAttribute(name, expandAttribute(attribute, index, name));
		}

		result.boundingBox = this.boundingBox?.clone();
		result.boundingSphere = this.boundingSphere?.clone();
		return result;
	}

	/** Computes a minimal bounding sphere from the position attribute. */
	computeBoundingSphere(): this {
		const posAttr = this.#attributes.get("position");
		if (!posAttr) return this;
		const { center, radius } = computeBoundingSphereData(
			posAttr.array,
			posAttr.itemSize,
		);
		this.boundingSphere = new Sphere(center, radius);
		return this;
	}

	/** Orients the geometry so its local -Z axis faces the target position. */
	lookAt(v: Vector3): this {
		_matrix.lookAt(_origin, v, _up);
		return this.applyMatrix4(_matrix);
	}

	/** Merges vertices within `mergeThreshold` and creates an index buffer. */
	mergeVertices(mergeThreshold = 0.0001): this {
		const position = this.#attributes.get("position");
		if (!position || this.#index) return this;

		const result = mergeVerticesData(position, mergeThreshold);
		if (!result) return this;
		const { remap, uniqueOldIndices } = result;

		for (const [name, attribute] of this.#attributes) {
			const merged = mergeAttributeData(attribute, uniqueOldIndices);
			this.#publishInternalUpdate(merged);
			this.#replaceAttribute(name, merged);
		}

		this.index = remap;
		this.#invalidateDerivedData(true, false);
		invalidateGeometryCaches(this);
		return this;
	}

	/** Serializes geometry metadata, attributes, index, draw range, and bounds. */
	toJSON(): {
		metadata: { version: number; type: string; generator: string };
		id: number;
		type: string;
		name: string;
		data: {
			attributes: Record<string, ReturnType<Attribute["toJSON"]>>;
			index?: { type: string; array: number[] };
			drawRange: { start: number; count: number };
			morphAttributes?: Record<string, ReturnType<Attribute["toJSON"]>[]>;
			morphTargetsRelative?: boolean;
			boundingSphere?: { center: [number, number, number]; radius: number };
		};
		parameters: Record<string, unknown>;
		userData: Record<string, unknown>;
	} {
		return {
			metadata: {
				version: 0.6,
				type: "Geometry",
				generator: "Geometry.toJSON",
			},
			id: this.id,
			type: this.type,
			name: this.name,
			data: buildGeometryData({
				attributes: this.#attributes,
				index: this.#index,
				drawRange: this.drawRange,
				morphTargetsRelative: this.morphTargetsRelative,
				...(this.morphAttributes === undefined
					? {}
					: { morphAttributes: this.morphAttributes }),
				boundingSphere: this.boundingSphere,
			}),
			parameters: { ...this.parameters },
			userData: { ...this.userData },
		};
	}

	/** Releases channel storage, indices, bounds, and derived caches. */
	dispose(): void {
		this.#clearAttributes();
		this.#index = undefined;
		this.boundingBox = undefined;
		this.boundingSphere = undefined;
		this.#clearSequentialIndices();
		this.#clearUvCache();
		invalidateGeometryCaches(this);
	}

	#invalidateDerivedData(positionChanged: boolean, uvChanged: boolean): void {
		if (positionChanged) {
			this.boundingBox = undefined;
			this.boundingSphere = undefined;
			this.#clearSequentialIndices();
		}
		if (uvChanged) this.#clearUvCache();
	}

	#clearSequentialIndices(): void {
		(
			this as unknown as {
				_sequentialIndices: Uint32Array | undefined;
			}
		)._sequentialIndices = undefined;
	}

	#clearUvCache(): void {
		(this as unknown as { _uvCache: Float32Array | undefined })._uvCache =
			undefined;
	}

	#replaceAttribute(name: string, attribute: Attribute): void {
		const previous = this.#attributes.get(name);
		if (previous === attribute) return;
		if (previous) {
			unregisterAttributeUpdateInvalidator(
				previous,
				this.#invalidateAttributeCaches,
			);
		}
		this.#attributes.set(name, attribute);
		registerAttributeUpdateInvalidator(
			attribute,
			this.#invalidateAttributeCaches,
		);
	}

	#clearAttributes(): void {
		for (const attribute of this.#attributes.values()) {
			unregisterAttributeUpdateInvalidator(
				attribute,
				this.#invalidateAttributeCaches,
			);
		}
		this.#attributes.clear();
	}

	#publishInternalUpdate(attribute: Attribute): void {
		this.#publishingInternalAttributeUpdate = true;
		try {
			attribute.needsUpdate = true;
		} finally {
			this.#publishingInternalAttributeUpdate = false;
		}
	}
}

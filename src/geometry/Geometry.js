import { Vector3 } from "../math/Vector3.js";
import { Attribute } from "./Attribute.js";

let _geometryId = 0;

/**
 * Vertex data store. Per-vertex color is a first-class shading path,
 * not an afterthought.
 */
export class Geometry {
	/** @type {number} */
	id = _geometryId++;

	/** @type {string} */
	name = "";

	/** @type {Map<string, Attribute>} */
	#attributes = new Map();

	/** @type {Uint16Array|Uint32Array|null} */
	#index = null;

	/** @type {import('../math/Box3.js').Box3|null} */
	boundingBox = null;

	/** @type {import('../math/Sphere.js').Sphere|null} */
	boundingSphere = null;

	/**
	 * @param {Float32Array|number[]} array Flat array of xyz positions.
	 * @returns {this}
	 */
	setPositions(array) {
		const data =
			array instanceof Float32Array ? array : new Float32Array(array);
		this.#attributes.set("position", new Attribute(data, 3));
		return this;
	}

	/**
	 * @param {Float32Array|number[]} array Flat array of uv pairs.
	 * @returns {this}
	 */
	setUVs(array) {
		const data =
			array instanceof Float32Array ? array : new Float32Array(array);
		this.#attributes.set("uv", new Attribute(data, 2));
		return this;
	}

	/**
	 * Per-vertex color. First-class alongside positions and UVs.
	 * @param {Float32Array|number[]} array Flat array of rgb triples (0-1).
	 * @returns {this}
	 */
	setColors(array) {
		const data =
			array instanceof Float32Array ? array : new Float32Array(array);
		this.#attributes.set("color", new Attribute(data, 3));
		return this;
	}

	/**
	 * @param {Float32Array|number[]} array Flat array of normal xyz triples.
	 * @returns {this}
	 */
	setNormals(array) {
		const data =
			array instanceof Float32Array ? array : new Float32Array(array);
		this.#attributes.set("normal", new Attribute(data, 3));
		return this;
	}

	/**
	 * @param {Uint16Array|Uint32Array|number[]} array Triangle index list.
	 * @returns {this}
	 */
	setIndex(array) {
		if (array instanceof Uint16Array || array instanceof Uint32Array) {
			this.#index = array;
		} else {
			this.#index =
				array.length > 65535 ? new Uint32Array(array) : new Uint16Array(array);
		}
		return this;
	}

	/**
	 * @param {string} name
	 * @returns {Attribute|undefined}
	 */
	getAttribute(name) {
		return this.#attributes.get(name);
	}

	/**
	 * @param {string} name
	 * @param {Attribute} attribute
	 * @returns {this}
	 */
	setAttribute(name, attribute) {
		this.#attributes.set(name, attribute);
		return this;
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	deleteAttribute(name) {
		return this.#attributes.delete(name);
	}

	/** @returns {Uint16Array|Uint32Array|null} */
	get index() {
		return this.#index;
	}

	/** @returns {Map<string, Attribute>} */
	get attributes() {
		return this.#attributes;
	}

	/**
	 * Compute flat (cross-product per face) vertex normals.
	 * @returns {this}
	 */
	computeVertexNormals() {
		const posAttr = this.#attributes.get("position");
		if (!posAttr) return this;

		const positions = posAttr.array;
		const normals = new Float32Array(positions.length);
		const index = this.#index;

		const pA = new Vector3();
		const pB = new Vector3();
		const pC = new Vector3();
		const cb = new Vector3();
		const ab = new Vector3();

		if (index) {
			for (let i = 0; i < index.length; i += 3) {
				const a = index[i] * 3;
				const b = index[i + 1] * 3;
				const c = index[i + 2] * 3;

				pA.set(positions[a], positions[a + 1], positions[a + 2]);
				pB.set(positions[b], positions[b + 1], positions[b + 2]);
				pC.set(positions[c], positions[c + 1], positions[c + 2]);

				cb.copy(pC).sub(pB);
				ab.copy(pA).sub(pB);
				cb.cross(ab);

				normals[a] += cb.x;
				normals[a + 1] += cb.y;
				normals[a + 2] += cb.z;
				normals[b] += cb.x;
				normals[b + 1] += cb.y;
				normals[b + 2] += cb.z;
				normals[c] += cb.x;
				normals[c + 1] += cb.y;
				normals[c + 2] += cb.z;
			}
		} else {
			for (let i = 0; i < positions.length; i += 9) {
				pA.set(positions[i], positions[i + 1], positions[i + 2]);
				pB.set(positions[i + 3], positions[i + 4], positions[i + 5]);
				pC.set(positions[i + 6], positions[i + 7], positions[i + 8]);

				cb.copy(pC).sub(pB);
				ab.copy(pA).sub(pB);
				cb.cross(ab);

				normals[i] = cb.x;
				normals[i + 1] = cb.y;
				normals[i + 2] = cb.z;
				normals[i + 3] = cb.x;
				normals[i + 4] = cb.y;
				normals[i + 5] = cb.z;
				normals[i + 6] = cb.x;
				normals[i + 7] = cb.y;
				normals[i + 8] = cb.z;
			}
		}

		// normalize
		const nv = new Vector3();
		for (let i = 0; i < normals.length; i += 3) {
			nv.set(normals[i], normals[i + 1], normals[i + 2]).normalize();
			normals[i] = nv.x;
			normals[i + 1] = nv.y;
			normals[i + 2] = nv.z;
		}

		this.#attributes.set("normal", new Attribute(normals, 3));
		return this;
	}

	/** @returns {void} */
	dispose() {
		this.#attributes.clear();
		this.#index = null;
	}
}

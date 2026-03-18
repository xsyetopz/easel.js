import { Euler } from "../math/Euler.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Quaternion } from "../math/Quaternion.js";
import { Vector3 } from "../math/Vector3.js";
import { EventDispatcher } from "./EventDispatcher.js";
import { Layers } from "./Layers.js";

const _position = new Vector3();
const _m1 = new Matrix4();
const _q1 = new Quaternion();

let _nodeId = 0;

export class Node extends EventDispatcher {
	/** @type {number} */
	id = _nodeId++;

	/** @type {string} */
	name = "";

	/** @type {string} */
	type = "Node";

	/** @type {Node|null} */
	parent = null;

	/** @type {Node[]} */
	children = [];

	position = new Vector3();
	#rotation = new Euler();
	#quaternion = new Quaternion();
	scale = new Vector3(1, 1, 1);

	matrix = new Matrix4();
	matrixWorld = new Matrix4();
	autoUpdateMatrix = true;

	visible = true;
	frustumCulled = true;
	layers = new Layers();

	/** @type {Record<string, *>} */
	userData = {};

	constructor() {
		super();
		this.#rotation.setOnChangeCallback(() => {
			this.#quaternion.setFromEuler(this.#rotation);
		});
		this.updateMatrix();
	}

	/** @returns {Euler} */
	get rotation() {
		return this.#rotation;
	}

	/** @param {Euler} value */
	set rotation(value) {
		this.#rotation.copy(value);
	}

	/** @returns {Quaternion} */
	get quaternion() {
		return this.#quaternion;
	}

	/** @param {Quaternion} value */
	set quaternion(value) {
		this.#quaternion.copy(value);
		this.#rotation.setFromQuaternion(this.#quaternion);
	}

	/**
	 * @param {Node} object
	 * @returns {this}
	 */
	add(object) {
		if (object === this) return this;

		object.parent?.remove(object);
		object.parent = this;
		this.children.push(object);

		return this;
	}

	/**
	 * @param {Node} object
	 * @returns {this}
	 */
	remove(object) {
		const index = this.children.indexOf(object);
		if (index !== -1) {
			object.parent = null;
			this.children.splice(index, 1);
		}
		return this;
	}

	/**
	 * @param {(node: Node) => void} callback
	 * @returns {void}
	 */
	traverse(callback) {
		callback(this);
		for (const child of this.children) {
			child.traverse(callback);
		}
	}

	/**
	 * @param {(node: Node) => void} callback
	 * @returns {void}
	 */
	traverseVisible(callback) {
		if (!this.visible) return;
		callback(this);
		for (const child of this.children) {
			child.traverseVisible(callback);
		}
	}

	/**
	 * @param {Vector3|number} target
	 * @param {number} [y]
	 * @param {number} [z]
	 * @returns {this}
	 */
	lookAt(target, y, z) {
		this.updateWorldMatrix(true, false);

		const targetVector =
			target instanceof Vector3 ? target : new Vector3(target, y, z);

		_position.setFromMatrixPosition(this.matrixWorld);

		if (this.type === "Camera") {
			_m1.lookAt(_position, targetVector, new Vector3(0, 1, 0));
		} else {
			_m1.lookAt(targetVector, _position, new Vector3(0, 1, 0));
		}

		this.quaternion.setFromRotationMatrix(_m1);

		if (this.parent) {
			_m1.extractRotation(this.parent.matrixWorld);
			_q1.setFromRotationMatrix(_m1);
			this.quaternion.premul(_q1.invert());
		}

		this.rotation.setFromQuaternion(this.quaternion);

		return this;
	}

	/** @returns {void} */
	updateMatrix() {
		this.matrix.compose(this.position, this.quaternion, this.scale);
	}

	/**
	 * @param {boolean} [updateParents=false]
	 * @param {boolean} [updateChildren=true]
	 * @returns {void}
	 */
	updateWorldMatrix(updateParents = false, updateChildren = true) {
		if (updateParents && this.parent) {
			this.parent.updateWorldMatrix(true, false);
		}
		if (this.autoUpdateMatrix) this.updateMatrix();

		if (this.parent) {
			this.matrixWorld.mulMatrices(this.parent.matrixWorld, this.matrix);
		} else {
			this.matrixWorld.copy(this.matrix);
		}

		if (updateChildren) {
			for (const child of this.children) {
				child.updateWorldMatrix(false, true);
			}
		}
	}

	/**
	 * @returns {Node}
	 */
	clone() {
		return new Node().copy(this);
	}

	/**
	 * @param {Node} source
	 * @param {boolean} [recursive=true]
	 * @returns {this}
	 */
	copy(source, recursive = true) {
		this.name = source.name;

		this.position.copy(source.position);
		this.quaternion = source.quaternion;
		this.scale.copy(source.scale);

		this.matrix.copy(source.matrix);
		this.matrixWorld.copy(source.matrixWorld);

		this.visible = source.visible;
		this.frustumCulled = source.frustumCulled;
		this.userData = JSON.parse(JSON.stringify(source.userData));

		if (recursive) {
			for (const child of source.children) {
				this.add(child.clone());
			}
		}
		return this;
	}
}

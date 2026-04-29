import { Euler } from "../math/Euler.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import { EventDispatcher } from "./EventDispatcher.ts";
import { Layers } from "./Layers.ts";

const _position = new Vector3();
const _m1 = new Matrix4();
const _q1 = new Quaternion();

let _nodeId = 0;

/** Base scene graph node with transform, hierarchy, and traversal. */
export class Node extends EventDispatcher {
	id: number = _nodeId++;

	name = "";

	type = "Node";

	parent: Node | undefined = undefined;

	children: Node[] = [];

	position: Vector3 = new Vector3();
	#rotation: Euler = new Euler();
	#quaternion: Quaternion = new Quaternion();
	scale: Vector3 = new Vector3(1, 1, 1);

	matrix: Matrix4 = new Matrix4();
	matrixWorld: Matrix4 = new Matrix4();
	#matrixAutoUpdate = true;
	matrixWorldAutoUpdate = true;

	matrixWorldNeedsUpdate = true;

	visible = true;
	frustumCulled = true;
	layers: Layers = new Layers();

	userData: Record<string, unknown> = {};

	#lastPosX = 0;
	#lastPosY = 0;
	#lastPosZ = 0;
	#lastQuatX = 0;
	#lastQuatY = 0;
	#lastQuatZ = 0;
	#lastQuatW = 1;
	#lastScaleX = 1;
	#lastScaleY = 1;
	#lastScaleZ = 1;
	#localIsIdentity = false;

	constructor() {
		super();
		this.#rotation.setOnChangeCallback(() => {
			this.#quaternion.setFromEuler(this.#rotation);
		});
		this.updateMatrix();
	}

	get rotation(): Euler {
		return this.#rotation;
	}

	set rotation(value: Euler) {
		this.#rotation.copy(value);
	}

	get quaternion(): Quaternion {
		return this.#quaternion;
	}

	set quaternion(value: Quaternion) {
		this.#quaternion.copy(value);
		this.#rotation.setFromQuaternion(this.#quaternion);
	}

	get matrixAutoUpdate(): boolean {
		return this.#matrixAutoUpdate;
	}

	set matrixAutoUpdate(value: boolean) {
		this.#matrixAutoUpdate = value;
	}

	get autoUpdateMatrix(): boolean {
		return this.#matrixAutoUpdate;
	}

	set autoUpdateMatrix(value: boolean) {
		this.#matrixAutoUpdate = value;
	}

	add(object: Node): this {
		if (object === this) return this;

		object.parent?.remove(object);
		object.parent = this;
		this.children.push(object);
		// Parent transform now applies — world matrix must be recomputed.
		object.matrixWorldNeedsUpdate = true;

		return this;
	}

	remove(object: Node): this {
		const index = this.children.indexOf(object);
		if (index !== -1) {
			object.parent = undefined;
			object.matrixWorldNeedsUpdate = true;
			this.children.splice(index, 1);
		}
		return this;
	}

	traverse(callback: (node: Node) => void): void {
		callback(this);
		for (const child of this.children) {
			child.traverse(callback);
		}
	}

	traverseVisible(callback: (node: Node) => void): void {
		if (!this.visible) return;
		callback(this);
		for (const child of this.children) {
			child.traverseVisible(callback);
		}
	}

	lookAt(target: Vector3 | number, y?: number, z?: number): this {
		this.updateMatrixWorld(true, false);

		const targetVector =
			target instanceof Vector3 ? target : new Vector3(target, y, z);

		_position.setFromMatrixPosition(this.matrixWorld);

		if (typeof this.type === "string" && this.type.endsWith("Camera")) {
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

	updateMatrix(): void {
		this.matrix.compose(this.position, this.quaternion, this.scale);
		// Local matrix changed — world matrix is now stale.
		this.matrixWorldNeedsUpdate = true;
		this.#syncLocalCache();
	}

	#syncLocalCache(): void {
		const pos = this.position;
		const q = this.quaternion;
		const s = this.scale;
		this.#lastPosX = pos.x;
		this.#lastPosY = pos.y;
		this.#lastPosZ = pos.z;
		this.#lastQuatX = q.x;
		this.#lastQuatY = q.y;
		this.#lastQuatZ = q.z;
		this.#lastQuatW = q.w;
		this.#lastScaleX = s.x;
		this.#lastScaleY = s.y;
		this.#lastScaleZ = s.z;
		this.#localIsIdentity =
			this.#lastPosX === 0 &&
			this.#lastPosY === 0 &&
			this.#lastPosZ === 0 &&
			this.#lastQuatX === 0 &&
			this.#lastQuatY === 0 &&
			this.#lastQuatZ === 0 &&
			this.#lastQuatW === 1 &&
			this.#lastScaleX === 1 &&
			this.#lastScaleY === 1 &&
			this.#lastScaleZ === 1;
	}

	#updateLocalMatrixIfNeeded(): void {
		if (!this.autoUpdateMatrix) return;
		const pos = this.position;
		const q = this.quaternion;
		const s = this.scale;
		if (
			pos.x !== this.#lastPosX ||
			pos.y !== this.#lastPosY ||
			pos.z !== this.#lastPosZ ||
			q.x !== this.#lastQuatX ||
			q.y !== this.#lastQuatY ||
			q.z !== this.#lastQuatZ ||
			q.w !== this.#lastQuatW ||
			s.x !== this.#lastScaleX ||
			s.y !== this.#lastScaleY ||
			s.z !== this.#lastScaleZ
		) {
			this.updateMatrix();
		}
	}

	updateMatrixWorld(
		updateParents = false,
		updateChildren = true,
		force = false,
	): void {
		if (updateParents && this.parent) {
			this.parent.updateMatrixWorld(true, false);
		}
		this.#updateLocalMatrixIfNeeded();

		const updated = this.matrixWorldNeedsUpdate || force;
		if (updated) {
			if (this.parent) {
				if (this.autoUpdateMatrix && this.#localIsIdentity) {
					// Common fast path: local transform is identity so world == parent world.
					this.matrixWorld.copy(this.parent.matrixWorld);
				} else {
					this.matrixWorld.mulMatricesAffine(
						this.parent.matrixWorld,
						this.matrix,
					);
				}
			} else {
				this.matrixWorld.copy(this.matrix);
			}

			if (!updateChildren) {
				// When not updating children immediately, mark them dirty so a later
				// updateMatrixWorld() call recomputes their world matrices.
				for (const child of this.children) {
					child.matrixWorldNeedsUpdate = true;
				}
			}

			this.matrixWorldNeedsUpdate = false;
		}

		if (updateChildren) {
			for (const child of this.children) {
				if (child.matrixWorldAutoUpdate) {
					child.updateMatrixWorld(false, true, updated);
				}
			}
		}
	}

	clone(): Node {
		return new Node().copy(this);
	}

	copy(source: Node, recursive = true): this {
		this.name = source.name;

		this.position.copy(source.position);
		this.quaternion = source.quaternion;
		this.scale.copy(source.scale);

		this.matrix.copy(source.matrix);
		this.matrixWorld.copy(source.matrixWorld);
		this.matrixAutoUpdate = source.matrixAutoUpdate;
		this.matrixWorldAutoUpdate = source.matrixWorldAutoUpdate;

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

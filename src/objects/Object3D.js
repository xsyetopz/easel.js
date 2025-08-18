import { Vector3 } from "../math/Vector3.js";
import { Quaternion } from "../math/Quaternion.js";
import { Euler } from "../math/Euler.js";
import { Matrix4 } from "../math/Matrix4.js";

const _position = new Vector3();
const _m1 = new Matrix4();
const _q1 = new Quaternion();

export class Object3D {
    /** @private @type {Euler} */ #rotation;
    /** @private @type {Quaternion} */ #quaternion;

    /**
     * Creates new Object3D.
     */
    constructor() {
        /** Unique identifier. */
        this.id = crypto.randomUUID();

        /** Optional name. */
        this.name = "";

        /** Local position. */
        this.position = new Vector3();

        this.#rotation = new Euler();
        this.#quaternion = new Quaternion();

        /** Local scale. */
        this.scale = new Vector3(1, 1, 1);

        /** Local transformation matrix. */
        this.matrix = new Matrix4();

        /** World transformation matrix. */
        this.worldMatrix = new Matrix4();

        /** If true, updates local matrix automatically. */
        this.autoUpdateMatrix = true;

        /** Parent object, if any. */
        this.parent = undefined;

        /** Array of child objects. */
        this.children = [];

        /** If false, object is not rendered. */
        this.visible = true;

        /** If true, object is subject to frustum culling. */
        this.frustumCulled = true;

        /** User-defined data. */
        this.userData = {};

        this.#rotation.setOnChangeCallback(() => {
            this.#quaternion.setFromEuler(this.#rotation);
        });
        this.updateMatrix();
    }

    /**
     * Local rotation (Euler angles).
     * @readonly @type {Euler}
     */
    get rotation() {
        return this.#rotation;
    }
    set rotation(value) {
        this.#rotation.copy(value);
    }

    /**
     * Local rotation (quaternion).
     * @readonly @type {Quaternion}
     */
    get quaternion() {
        return this.#quaternion;
    }
    set quaternion(value) {
        this.#quaternion.copy(value);
        this.#rotation.setFromQuaternion(this.#quaternion);
    }

    /**
     * True if this object is Camera.
     * @readonly @type {boolean}
     */
    get isCamera() {
        return ("projectionMatrix" in this) && ("matrixWorldInverse" in this);
    }

    /**
     * True if this object is Mesh.
     * @readonly @type {boolean}
     */
    get isMesh() {
        return Object.getPrototypeOf(this).constructor.name === "Mesh";
    }

    /**
     * Adds child object.
     * @param {Object3D} object
     * @returns {Object3D} this object
     */
    add(object) {
        if (object === this) return this;
        if (object.parent) object.parent.remove(object);
        object.parent = this;
        this.children.push(object);
        return this;
    }

    /**
     * Returns clone of this object (deep copy).
     * @returns {Object3D} this object
     */
    clone() {
        return new Object3D().copy(this);
    }

    /**
     * Copies properties from another Object3D.
     * @param {Object3D} source
     * @param {boolean} [recursive=true]
     * @returns {Object3D} this object
     */
    copy(source, recursive = true) {
        this.id = crypto.randomUUID();
        this.name = source.name;
        this.position.copy(source.position);
        this.quaternion.copy(source.quaternion);
        this.scale.copy(source.scale);
        this.matrix.copy(source.matrix);
        this.worldMatrix.copy(source.worldMatrix);
        this.visible = source.visible;
        this.userData = JSON.parse(JSON.stringify(source.userData));
        if (recursive) {
            for (const child of source.children) {
                this.add(child.clone());
            }
        }
        return this;
    }

    /**
     * Orients object to look at target point.
     * @param {Vector3|number} target target vector or x
     * @param {number} [y] y (if target is number)
     * @param {number} [z] z (if target is number)
     * @returns {Object3D} this object
     */
    lookAt(target, y, z) {
        this.updateWorldMatrix(true, false);
        const targetVector = target instanceof Vector3
            ? target
            : new Vector3(target, y, z);
        _position.setFromMatrixPosition(this.worldMatrix);
        _m1.lookAt(
            this.isCamera ? _position : targetVector,
            this.isCamera ? targetVector : _position,
            new Vector3(0, 1, 0)
        );
        this.quaternion.setFromRotationMatrix(_m1);
        if (this.parent) {
            _m1.extractRotation(this.parent.worldMatrix);
            _q1.setFromRotationMatrix(_m1);
            this.quaternion.premul(_q1.invert());
        }
        this.rotation.setFromQuaternion(this.quaternion);
        return this;
    }

    /**
     * Removes child object.
     * @param {Object3D} object
     * @returns {Object3D} this object
     */
    remove(object) {
        const index = this.children.indexOf(object);
        if (index !== -1) {
            object.parent = undefined;
            this.children.splice(index, 1);
        }
        return this;
    }

    /**
     * Traverses object and all descendants, calling callback for each.
     * @param {function(Object3D):void} callback
     */
    traverse(callback) {
        callback(this);
        for (const child of this.children) {
            child.traverse(callback);
        }
    }

    /**
     * Updateslocal transformation matrix from position, quaternion, and scale.
     */
    updateMatrix() {
        this.matrix.compose(this.position, this.quaternion, this.scale);
    }

    /**
     * Updates world transformation matrix.
     * @param {boolean} [updateParents=false]
     * @param {boolean} [updateChildren=true]
     */
    updateWorldMatrix(updateParents = false, updateChildren = true) {
        if (updateParents && this.parent) {
            this.parent.updateWorldMatrix(true, false);
        }
        if (this.autoUpdateMatrix) this.updateMatrix();
        this.worldMatrix = this.parent
            ? this.worldMatrix.mulMatrices(this.parent.worldMatrix, this.matrix)
            : this.worldMatrix.copy(this.matrix);
        if (updateChildren) {
            for (const child of this.children) {
                child.updateWorldMatrix(false, true);
            }
        }
    }
}

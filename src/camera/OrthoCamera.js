import { Camera } from './Camera.js';

export class OrthoCamera extends Camera {
    /**
     * @private @type {number}
     * @default -1
     */
    #left = -1;

    /**
     * @private @type {number}
     * @default 1
     */
    #right = 1;

    /**
     * @private @type {number}
     * @default 1
     */
    #top = 1;

    /**
     * @private @type {number}
     * @default -1
     */
    #bottom = -1;

    /**
     * @private @type {number}
     * @default 0.1
     */
    #near = 0.1;

    /**
     * @private @type {number}
     * @default 2000
     */
    #far = 2000;

    /**
     * Creates new OrthoCamera instance.
     * @param {number} [left=-1] - left boundary of view volume
     * @param {number} [right=1] - right boundary of view volume
     * @param {number} [top=1] - top boundary of view volume
     * @param {number} [bottom=-1] - bottom boundary of view volume
     * @param {number} [near=0.1] - near clipping plane
     * @param {number} [far=2000] - far clipping plane
     */
    constructor(left = -1, right = 1, top = 1, bottom = -1, near = 0.1, far = 2000) {
        super();
        /** @readonly @type {string} */
        this.name = "OrthoCamera";
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
        this.near = near;
        this.far = far;
        this.updateProjectionMatrix();
    }

    /** @readonly */
    get left() { return this.#left; }
    set left(value) { this.#left = value; this.updateProjectionMatrix(); }
    /** @readonly */
    get right() { return this.#right; }
    set right(value) { this.#right = value; this.updateProjectionMatrix(); }
    /** @readonly */
    get top() { return this.#top; }
    set top(value) { this.#top = value; this.updateProjectionMatrix(); }
    /** @readonly */
    get bottom() { return this.#bottom; }
    set bottom(value) { this.#bottom = value; this.updateProjectionMatrix(); }
    /** @readonly */
    get near() { return this.#near; }
    set near(value) { this.#near = value; this.updateProjectionMatrix(); }
    /** @readonly */
    get far() { return this.#far; }
    set far(value) { this.#far = value; this.updateProjectionMatrix(); }

    /**
     * Returns clone of this camera.
     * @returns {OrthoCamera}
     */
    clone() {
        return new OrthoCamera(
            this.left,
            this.right,
            this.top,
            this.bottom,
            this.near,
            this.far,
        );
    }

    /**
     * Copies properties from another OrthoCamera.
     * @param {OrthoCamera} source
     * @returns {OrthoCamera}
     */
    copy(source) {
        super.copy(source);
        this.left = source.left;
        this.right = source.right;
        this.top = source.top;
        this.bottom = source.bottom;
        this.near = source.near;
        this.far = source.far;
        return this;
    }

    /**
     * Updates orthographic projection matrix.
     * @override
     */
    updateProjectionMatrix() {
        this.projectionMatrix.makeOrtho(
            this.left,
            this.right,
            this.top,
            this.bottom,
            this.near,
            this.far,
        );
    }
}

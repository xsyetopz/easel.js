import { BaseCamera } from "./BaseCamera.js";
import { MathUtils } from "../math/MathUtils.js";

export class PerspCamera extends BaseCamera {
    /**
     * @private @type {number}
     * @default 50
     */
    #fov = 50;

    /**
     * @private @type {number}
     * @default 1
     */
    #aspect = 1;

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
     * Creates new PerspCamera.
     * @param {number} [fov = 50] - field of view in degrees
     * @param {number} [aspect = 1] - aspect ratio
     * @param {number} [near = 0.1] - near clipping plane
     * @param {number} [far = 2000] - far clipping plane
     */
    constructor(fov = 50, aspect = 1, near = 0.1, far = 2000) {
        super();
        /** @readonly @type {string} */
        this.name = "PerspCamera";
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.updateProjectionMatrix();
    }

    /** @readonly */
    get fov() { return this.#fov; }
    set fov(value) { this.#fov = value; this.updateProjectionMatrix(); }
    /** @readonly */
    get aspect() { return this.#aspect; }
    set aspect(value) { this.#aspect = value; this.updateProjectionMatrix(); }
    /** @readonly */
    get near() { return this.#near; }
    set near(value) { this.#near = value; this.updateProjectionMatrix(); }
    /** @readonly */
    get far() { return this.#far; }
    set far(value) { this.#far = value; this.updateProjectionMatrix(); }

    /**
     * Returns clone of this camera.
     * @returns {PerspCamera}
     */
    clone() {
        return new PerspCamera(
            this.fov,
            this.aspect,
            this.near,
            this.far,
        );
    }

    /**
     * Copies properties from another PerspCamera.
     * @param {PerspCamera} source
     * @returns {PerspCamera}
     */
    copy(source) {
        super.copy(source);
        this.fov = source.fov;
        this.aspect = source.aspect;
        this.near = source.near;
        this.far = source.far;
        return this;
    }

    /**
     * Updates perspective projection matrix.
     * @override
     */
    updateProjectionMatrix() {
        this.projectionMatrix.makePersp(
            MathUtils.toRadians(this.fov),
            this.aspect,
            this.near,
            this.far,
        );
    }
}

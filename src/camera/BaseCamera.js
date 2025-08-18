import { Matrix4 } from "../math/Matrix4.js";
import { Object3D } from "../objects/Object3D.js";

/**
 * Base class for all cameras.
 * @extends Object3D
 */
export class BaseCamera extends Object3D {
    /**
     * Creates new BaseCamera.
     */
    constructor() {
        super();

        /** @readonly @type {string} */
        this.name = "BaseCamera";

        /**
         * @readonly @type {Matrix4}
         * @default new Matrix4()
         */
        this.projectionMatrix = new Matrix4();

        /**
         * @readonly @type {Matrix4}
         * @default new Matrix4()
         */
        this.matrixWorldInverse = new Matrix4();
    }

    /**
     * Returns clone of this camera.
     * @returns {BaseCamera}
     */
    clone() {
        return new BaseCamera().copy(this);
    }

    /**
     * Copies properties from another camera.
     * @param {BaseCamera} source
     * @returns {BaseCamera}
     */
    copy(source) {
        super.copy(source);
        this.projectionMatrix.copy(source.projectionMatrix);
        this.matrixWorldInverse.copy(source.matrixWorldInverse);
        return this;
    }

    /**
     * Updates world matrix and its inverse.
     * @param {boolean} [force=false]
     */
    updateMatrixWorld(force = false) {
        super.updateWorldMatrix(force, false);
        this.matrixWorldInverse.copy(this.worldMatrix).invert();
    }

    /**
     * Updates projection matrix. Must be implemented in subclasses.
     * @throws {Error}
     */
    updateProjectionMatrix() {
        throw new Error(
            "BaseCamera.updateProjectionMatrix(): must be implemented in subclass"
        );
    }
}

/**
 * Base class for all materials.
 * @abstract
 */
export class Material {
    /**
     * Creates new Material instance.
     */
    constructor(
    ) {
        /**
         * Optional name for material.
         * @type {string}
         * @default ""
         */
        this.name = "";

        /**
         * User-defined data.
         * @type {Object}
         * @default {}
         */
        this.userData = {};
    }

    /**
     * Returns clone of this material.
     * @returns {Material}
     */
    clone() {
        const material = new Material();
        material.name = this.name;
        material.userData = JSON.parse(JSON.stringify(this.userData));
        return material;
    }
}

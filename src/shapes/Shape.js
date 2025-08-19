/**
 * Base class for all geometric shapes.
 * @abstract
 */
export class Shape {
    constructor() {
        /**
         * Optional name for shape.
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
     * Returns clone of this shape.
     * @returns {Shape}
     */
    clone() {
        const shape = new Shape();
        shape.name = this.name;
        shape.userData = JSON.parse(JSON.stringify(this.userData));
        return shape;
    }
}

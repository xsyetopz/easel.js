import { Object3D } from "./Object3D.js";

export class Mesh extends Object3D {
    #shape;
    constructor(shape, material) {
        super();
        this.#shape = shape;
        this.material = material;
        this.updateMatrix();
    }

    get shape() {
        return this.#shape;
    }

    set shape(value) {
        this.#shape = value;
        this.updateMatrix();
    }

    clone() {
        return new Mesh(this.shape.clone(), this.material.clone()).copy(this);
    }

    copy(source) {
        super.copy(source);
        this.shape = source.shape.clone();
        this.material = source.material.clone();
        return this;
    }
}

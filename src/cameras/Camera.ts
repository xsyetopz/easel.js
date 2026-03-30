import { Node } from "../core/Node.ts";
import { Matrix4 } from "../math/Matrix4.ts";

/**
 * Abstract base class for all camera types.
 * Subclasses must override {@link updateProjectionMatrix}.
 */
export class Camera extends Node {
	override type = "Camera";

	projectionMatrix: Matrix4 = new Matrix4();
	matrixWorldInverse: Matrix4 = new Matrix4();

	#near: number;
	#far: number;
	#tileSize: number;

	constructor({ near = 0.1, far = 2000, tileSize = 1 } = {}) {
		super();
		this.#near = near;
		this.#far = far;
		this.#tileSize = tileSize;
	}

	get near(): number {
		return this.#near;
	}

	set near(value: number) {
		this.#near = value;
	}

	get far(): number {
		return this.#far;
	}

	set far(value: number) {
		this.#far = value;
	}

	get tileSize(): number {
		return this.#tileSize;
	}

	set tileSize(value: number) {
		this.#tileSize = value;
	}

	updateProjectionMatrix(): void {
		// Subclasses override this to rebuild projectionMatrix.
	}

	override updateMatrixWorld(force = false): void {
		super.updateMatrixWorld(force, false, force);
		this.matrixWorldInverse.copy(this.matrixWorld).invert();
	}

	override clone(): Camera {
		throw new Error(
			"Camera.clone: use OrthographicCamera or PerspectiveCamera",
		);
	}

	override copy(source: Camera, recursive = true): this {
		super.copy(source, recursive);

		this.projectionMatrix.copy(source.projectionMatrix);
		this.matrixWorldInverse.copy(source.matrixWorldInverse);
		this.#near = source.near;
		this.#far = source.far;
		this.#tileSize = source.tileSize;
		return this;
	}
}

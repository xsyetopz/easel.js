import { MathUtils } from "../math/MathUtils.ts";
import { Camera } from "./Camera.ts";

export interface PerspectiveCameraOptions {
	/** Vertical field of view in degrees. */
	fov?: number;
	/** Viewport width / height. */
	aspect?: number;
	near?: number;
	far?: number;
	tileSize?: number;
}

/**
 * Perspective projection camera. Produces the non-unit W values that make
 * affine UV interpolation visibly incorrect - the classic RuneTek 3 artifact.
 */
export class PerspectiveCamera extends Camera {
	override type = "PerspectiveCamera";

	#fov: number;
	#aspect: number;

	constructor({
		fov = 45,
		aspect = 1,
		near = 0.1,
		far = 2000,
		tileSize = 1,
	}: PerspectiveCameraOptions = {}) {
		super({ near, far, tileSize });
		this.#fov = fov;
		this.#aspect = aspect;
		this.updateProjectionMatrix();
	}

	get fov(): number {
		return this.#fov;
	}

	set fov(value: number) {
		this.#fov = value;
	}

	get aspect(): number {
		return this.#aspect;
	}

	set aspect(value: number) {
		this.#aspect = value;
	}

	override updateProjectionMatrix(): void {
		this.projectionMatrix.makePerspective(
			MathUtils.toRadians(this.#fov),
			this.#aspect,
			this.near,
			this.far,
		);
	}

	override clone(): PerspectiveCamera {
		return new PerspectiveCamera({
			fov: this.#fov,
			aspect: this.#aspect,
			near: this.near,
			far: this.far,
			tileSize: this.tileSize,
		});
	}

	override copy(source: Camera, recursive = true): this {
		super.copy(source, recursive);
		if (!(source instanceof PerspectiveCamera)) return this;
		this.#fov = source.fov;
		this.#aspect = source.aspect;
		return this;
	}
}

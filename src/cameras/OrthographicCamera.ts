import { Camera } from "./Camera.ts";

/** Orthographic projection camera. */
export class OrthographicCamera extends Camera {
  override type = "OrthographicCamera";

  #left: number;
  #right: number;
  #top: number;
  #bottom: number;

  constructor({
    left = -1,
    right = 1,
    top = 1,
    bottom = -1,
    near = 0.1,
    far = 2000,
    tileSize = 1,
  } = {}) {
    super({ near, far, tileSize });
    this.#left = left;
    this.#right = right;
    this.#top = top;
    this.#bottom = bottom;
    this.updateProjectionMatrix();
  }

  get left(): number {
    return this.#left;
  }

  set left(value: number) {
    this.#left = value;
  }

  get right(): number {
    return this.#right;
  }

  set right(value: number) {
    this.#right = value;
  }

  get top(): number {
    return this.#top;
  }

  set top(value: number) {
    this.#top = value;
  }

  get bottom(): number {
    return this.#bottom;
  }

  set bottom(value: number) {
    this.#bottom = value;
  }

  override updateProjectionMatrix(): void {
    this.projectionMatrix.makeOrthographic(
      this.#left,
      this.#right,
      this.#top,
      this.#bottom,
      this.near,
      this.far,
    );
  }

  override clone(): OrthographicCamera {
    return new OrthographicCamera({
      left: this.#left,
      right: this.#right,
      top: this.#top,
      bottom: this.#bottom,
      near: this.near,
      far: this.far,
      tileSize: this.tileSize,
    });
  }

  override copy(source: Camera, recursive = true): this {
    super.copy(source, recursive);
    if (!(source instanceof OrthographicCamera)) return this;
    this.#left = source.left;
    this.#right = source.right;
    this.#top = source.top;
    this.#bottom = source.bottom;
    return this;
  }
}

import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import type { Color, ColorValue } from "../math/Color.ts";
import type { Plane } from "../math/Plane.ts";
import { Line } from "../objects/Line.ts";

/** Explicit wireframe visualization of an infinite plane. */
export class PlaneHelper extends Line {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "PlaneHelper";

  /** Returns `true` for this concrete type. */
  get isPlaneHelper(): true {
    return true;
  }

  #plane: Plane;
  #size: number;

  /** Constructs a line helper aligned to a plane equation. */
  constructor(
    plane: Plane,
    size: number = 1,
    color: Color | number | string = 0xffff00,
  ) {
    assertSize(size);
    const geometry = new Geometry();
    geometry.setAttribute(
      "position",
      new Attribute(
        new Float32Array([
          1, -1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0, -1, -1, 0, 1, -1, 0,
          1, 1, 0,
        ]),
        3,
      ),
    );
    super(geometry, new LineMaterial({ color }));
    this.#plane = plane;
    this.#size = size;
  }

  /** Plane equation that orients the helper line. */
  get plane(): Plane {
    return this.#plane;
  }

  /** Replaces the plane equation used by this helper. */
  set plane(value: Plane) {
    this.#plane = value;
  }

  /** Wireframe extent in local units. */
  get size(): number {
    return this.#size;
  }

  /** Sets the wireframe extent in local units and updates the line geometry. */
  set size(value: number) {
    assertSize(value);
    this.#size = value;
  }

  /** Base RGB color for integer-rasterized line primitives. */
  get color(): Color {
    const material = this.material;
    if (!(material instanceof LineMaterial)) {
      throw new Error("PlaneHelper line material is unavailable.");
    }
    return material.color;
  }

  /** Sets the line color without rebuilding geometry. */
  set color(value: ColorValue) {
    this.color.set(value);
  }

  /** Explicitly aligns the wireframe with the current plane equation. */
  update(): this {
    const { normal, constant } = this.#plane;
    this.position.copy(normal).multiplyScalar(-constant);
    this.scale.set(this.#size * 0.5, this.#size * 0.5, 1);

    if (normal.z < -0.999999) {
      this.quaternion.set(1, 0, 0, 0);
    } else {
      const x = -normal.y;
      const y = normal.x;
      const w = 1 + normal.z;
      const inverseLength = 1 / Math.sqrt(x * x + y * y + w * w);
      this.quaternion.set(
        x * inverseLength,
        y * inverseLength,
        0,
        w * inverseLength,
      );
    }
    this.rotation.setFromQuaternion(this.quaternion);
    return this;
  }

  /** Returns an independent helper with copied plane, geometry, and material. */
  override clone(): PlaneHelper {
    return new PlaneHelper(this.plane, this.size, this.color).copy(this);
  }

  /** Copies transform, plane reference, size, geometry, and material state. */
  override copy(source: PlaneHelper): this {
    super.copy(source, false);
    this.#plane = source.plane;
    this.#size = source.size;
    this.geometry = source.geometry?.clone();
    this.material = source.material?.clone();
    return this;
  }

  /** Releases owned geometry, materials, and CPU buffers. */
  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
  }
}

function assertSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError("PlaneHelper size must be a positive finite number.");
  }
}

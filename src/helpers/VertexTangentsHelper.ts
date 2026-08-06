import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import type { Color, ColorValue } from "../math/Color.ts";
import type { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { LineSegments } from "../objects/LineSegments.ts";

/** Mesh-like object whose prepared geometry and world matrix feed a tangent helper. */
export interface VertexTangentsHelperObject {
  /** Geometry supplying position and tangent channels. */
  readonly geometry: Geometry | undefined;
  /** Prepared world transform used when writing helper endpoints. */
  readonly matrixWorld: Matrix4;
  /** Updates this object and optionally its ancestors/descendants. */
  updateMatrixWorld(
    updateParents?: boolean,
    updateChildren?: boolean,
    force?: boolean,
  ): void;
}

const _position = new Vector3();
const _tangent = new Vector3();

/** Displays each prepared vertex tangent as a CPU-rendered line segment. */
export class VertexTangentsHelper extends LineSegments {
  override type: string = "VertexTangentsHelper";

  /** Returns `true` for this concrete type. */
  get isVertexTangentsHelper(): true {
    return true;
  }

  /** Object whose prepared geometry supplies positions and tangents. */
  object: VertexTangentsHelperObject;

  #size: number;

  /** Length multiplier applied to every tangent line. */
  get size(): number {
    return this.#size;
  }

  set size(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        "VertexTangentsHelper.size must be positive and finite.",
      );
    }
    this.#size = value;
  }

  /** Line color used for every tangent segment. */
  get color(): Color {
    if (!(this.material instanceof LineMaterial)) {
      throw new Error("VertexTangentsHelper line material is unavailable.");
    }
    return this.material.color;
  }

  set color(value: ColorValue) {
    this.color.set(value);
  }

  /** Constructs a tangent-line helper over an object's prepared attributes. */
  constructor(
    object: VertexTangentsHelperObject,
    size: number = 1,
    color: ColorValue = 0x00ffff,
  ) {
    const source = assertSource(object);
    if (source.position.count !== source.tangent.count) {
      throw new RangeError(
        "VertexTangentsHelper requires position and tangent counts to match.",
      );
    }
    const geometry = new Geometry();
    geometry.setAttribute(
      "position",
      new Attribute(new Float32Array(source.tangent.count * 2 * 3), 3),
    );
    super(geometry, new LineMaterial({ color }));

    this.object = object;
    this.#size = 1;
    this.size = size;
    this.matrixAutoUpdate = false;
    this.update();
  }

  /** Rebuilds line endpoints from the object's current world transform. */
  update(): this {
    const source = assertSource(this.object);
    if (source.position.count !== source.tangent.count) {
      throw new RangeError(
        "VertexTangentsHelper requires position and tangent counts to match.",
      );
    }
    this.object.updateMatrixWorld(true);
    const position = this.geometry?.getAttribute("position");
    if (!(position?.array instanceof Float32Array)) {
      throw new Error("VertexTangentsHelper position storage is unavailable.");
    }

    let output = 0;
    for (let index = 0; index < source.position.count; index++) {
      _position
        .set(
          source.position.getX(index),
          source.position.getY(index),
          source.position.getZ(index),
        )
        .applyMatrix4(this.object.matrixWorld);
      _tangent
        .set(
          source.tangent.getX(index),
          source.tangent.getY(index),
          source.tangent.getZ(index),
        )
        .transformDirection(this.object.matrixWorld)
        .multiplyScalar(this.#size)
        .add(_position);
      position.setXYZ(output, _position.x, _position.y, _position.z);
      position.setXYZ(output + 1, _tangent.x, _tangent.y, _tangent.z);
      output += 2;
    }
    position.needsUpdate = true;
    return this;
  }

  /** Returns an independent helper retaining this object's source and settings. */
  override clone(): VertexTangentsHelper {
    return new VertexTangentsHelper(this.object, this.#size, this.color).copy(
      this,
    );
  }

  /** Copies transform, line geometry, and material state. */
  override copy(source: VertexTangentsHelper): this {
    super.copy(source, false);
    this.geometry = source.geometry?.clone();
    this.material = source.material?.clone();
    this.object = source.object;
    this.#size = source.#size;
    return this;
  }

  /** Releases owned line geometry and material resources. */
  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
  }
}

function assertSource(object: VertexTangentsHelperObject): {
  position: Attribute;
  tangent: Attribute;
} {
  if (!object || typeof object !== "object" || !object.geometry) {
    throw new TypeError(
      "VertexTangentsHelper requires a geometry tangent source.",
    );
  }
  const position = object.geometry.getAttribute("position");
  const tangent = object.geometry.getAttribute("tangent");
  if (!(position && tangent)) {
    throw new TypeError(
      "VertexTangentsHelper requires position and tangent attributes.",
    );
  }
  if (position.itemSize < 3 || tangent.itemSize < 3) {
    throw new TypeError(
      "VertexTangentsHelper requires xyz position and tangent attributes.",
    );
  }
  return { position, tangent };
}

import type { Attribute as AttributeType } from "../geometry/Attribute.ts";
import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import type { Color, ColorValue } from "../math/Color.ts";
import { Matrix3 } from "../math/Matrix3.ts";
import type { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { LineSegments } from "../objects/LineSegments.ts";

/** Mesh-like object whose prepared geometry and world matrix feed a vertex helper. */
export interface VertexNormalsHelperObject {
  /** Geometry supplying position and normal channels. */
  readonly geometry?: Geometry;
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
const _normal = new Vector3();
const _normalMatrix = new Matrix3();

/** Displays each prepared vertex normal as a CPU-rendered line segment. */
export class VertexNormalsHelper extends LineSegments {
  override type: string = "VertexNormalsHelper";

  /** Returns `true` for this concrete type. */
  get isVertexNormalsHelper(): true {
    return true;
  }

  /** Object whose prepared geometry supplies positions and normals. */
  object: VertexNormalsHelperObject;

  #size: number;

  /** Length multiplier applied to every normal line. */
  get size(): number {
    return this.#size;
  }

  set size(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        "VertexNormalsHelper.size must be positive and finite.",
      );
    }
    this.#size = value;
  }

  /** Line color used for every normal segment. */
  get color(): Color {
    if (!(this.material instanceof LineMaterial)) {
      throw new Error("VertexNormalsHelper line material is unavailable.");
    }
    return this.material.color;
  }

  set color(value: ColorValue) {
    this.color.set(value);
  }

  /** Constructs a normal-line helper over an object's prepared attributes. */
  constructor(
    object: VertexNormalsHelperObject,
    size: number = 1,
    color: ColorValue = 0xff0000,
  ) {
    const source = assertSource(object, "normal");
    const positions = source.position;
    const normals = source.normal;
    if (positions.count !== normals.count) {
      throw new RangeError(
        "VertexNormalsHelper requires position and normal counts to match.",
      );
    }
    const geometry = new Geometry();
    geometry.setAttribute(
      "position",
      new Attribute(new Float32Array(normals.count * 2 * 3), 3),
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
    const source = assertSource(this.object, "normal");
    if (source.position.count !== source.normal.count) {
      throw new RangeError(
        "VertexNormalsHelper requires position and normal counts to match.",
      );
    }
    this.object.updateMatrixWorld(true);
    _normalMatrix.getNormalMatrix(this.object.matrixWorld);
    const position = this.geometry?.getAttribute("position");
    if (!(position?.array instanceof Float32Array)) {
      throw new Error("VertexNormalsHelper position storage is unavailable.");
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
      _normal
        .set(
          source.normal.getX(index),
          source.normal.getY(index),
          source.normal.getZ(index),
        )
        .applyNormalMatrix(_normalMatrix)
        .multiplyScalar(this.#size)
        .add(_position);
      position.setXYZ(output, _position.x, _position.y, _position.z);
      position.setXYZ(output + 1, _normal.x, _normal.y, _normal.z);
      output += 2;
    }
    position.needsUpdate = true;
    return this;
  }

  /** Returns an independent helper retaining this object's source and settings. */
  override clone(): VertexNormalsHelper {
    return new VertexNormalsHelper(this.object, this.#size, this.color).copy(
      this,
    );
  }

  /** Copies transform, line geometry, and material state. */
  override copy(source: VertexNormalsHelper): this {
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

function assertSource(
  object: VertexNormalsHelperObject,
  kind: "normal",
): { position: AttributeType; normal: AttributeType } {
  if (!object || typeof object !== "object" || !object.geometry) {
    throw new TypeError(
      `VertexNormalsHelper requires a geometry ${kind} source.`,
    );
  }
  const position = object.geometry.getAttribute("position");
  const normal = object.geometry.getAttribute(kind);
  if (!(position && normal)) {
    throw new TypeError(
      `VertexNormalsHelper requires position and ${kind} attributes.`,
    );
  }
  if (position.itemSize < 3 || normal.itemSize < 3) {
    throw new TypeError(
      "VertexNormalsHelper requires xyz position and normal attributes.",
    );
  }
  return { position, normal };
}

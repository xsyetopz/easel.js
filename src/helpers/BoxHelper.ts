import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Box3 } from "../math/Box3.ts";
import type { Color, ColorValue } from "../math/Color.ts";
import { LineSegments } from "../objects/LineSegments.ts";

const BOX_EDGE_CORNERS = Uint8Array.of(
  6,
  7,
  7,
  3,
  3,
  2,
  2,
  6,
  4,
  5,
  5,
  1,
  1,
  0,
  0,
  4,
  6,
  2,
  7,
  3,
  5,
  1,
  4,
  0,
);

/** Prepared object shape whose geometry.boundingBox supplies bounds. */
export interface BoxHelperObject {
  /** Prepared geometry whose boundingBox supplies the wireframe bounds. */
  readonly geometry?: {
    readonly boundingBox?: Box3;
  };
}

/** Box3 or prepared object accepted as a BoxHelper bounds source. */
export type BoxHelperSource = Box3 | BoxHelperObject;

/** Draws a wireframe for a prepared Box3 or an object's prepared bounding box. */
export class BoxHelper extends LineSegments {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "BoxHelper";

  /** Returns `true` for this concrete type. */
  get isBoxHelper(): true {
    return true;
  }

  #source: BoxHelperSource;

  /** Constructs a wireframe helper for a Box3 or prepared object bounds. */
  constructor(
    source: BoxHelperSource,
    color: Color | number | string = 0xffff00,
  ) {
    assertSource(source);
    const geometry = new Geometry();
    geometry.setAttribute(
      "position",
      new Attribute(new Float32Array(24 * 3), 3),
    );
    super(geometry, new LineMaterial({ color }));
    this.#source = source;
  }

  /** Box or prepared object used to rebuild this helper. */
  get source(): BoxHelperSource {
    return this.#source;
  }

  /** Replaces the bounds source used by this helper. */
  set source(value: BoxHelperSource) {
    assertSource(value);
    this.#source = value;
  }

  /** Base RGB color for integer-rasterized line primitives. */
  get color(): Color {
    const material = this.material;
    if (!(material instanceof LineMaterial)) {
      throw new Error("BoxHelper line material is unavailable.");
    }
    return material.color;
  }

  /** Sets the line color without replacing geometry. */
  set color(value: ColorValue) {
    this.color.set(value);
  }

  /** Explicitly rebuilds the wireframe from the source's already-prepared bounds. */
  update(): this {
    const box =
      this.#source instanceof Box3
        ? this.#source
        : this.#source.geometry?.boundingBox;
    if (!box) {
      throw new Error(
        "BoxHelper.update requires a prepared geometry.boundingBox.",
      );
    }
    if (box.isEmpty) return this;
    const position = this.geometry?.getAttribute("position");
    if (!(position?.array instanceof Float32Array)) {
      throw new Error("BoxHelper position storage is unavailable.");
    }
    writeBoxEdges(position.array, box);
    position.needsUpdate = true;
    return this;
  }

  /** Replaces the prepared object source and rebuilds its bounds once. */
  setFromObject(source: BoxHelperObject): this {
    this.source = source;
    return this.update();
  }

  /** Returns an independent helper with copied geometry and material. */
  override clone(): BoxHelper {
    return new BoxHelper(this.source, this.color).copy(this);
  }

  /** Copies transform, source, geometry, and material state. */
  override copy(source: BoxHelper): this {
    super.copy(source, false);
    this.#source = source.source;
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

function assertSource(source: BoxHelperSource): void {
  if (source instanceof Box3) return;
  if (source === undefined || source === null || typeof source !== "object") {
    throw new TypeError("BoxHelper source must be a Box3 or prepared object.");
  }
}

function writeBoxEdges(positions: Float32Array, box: Box3): void {
  const { x: x0, y: y0, z: z0 } = box.min;
  const { x: x1, y: y1, z: z1 } = box.max;
  for (let index = 0; index < BOX_EDGE_CORNERS.length; index++) {
    writeCorner(
      positions,
      index * 3,
      BOX_EDGE_CORNERS[index] ?? 0,
      x0,
      y0,
      z0,
      x1,
      y1,
      z1,
    );
  }
}

function writeCorner(
  positions: Float32Array,
  destination: number,
  corner: number,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): void {
  switch (corner) {
    case 0:
      positions[destination] = x1;
      positions[destination + 1] = y1;
      positions[destination + 2] = z1;
      break;
    case 1:
      positions[destination] = x0;
      positions[destination + 1] = y1;
      positions[destination + 2] = z1;
      break;
    case 2:
      positions[destination] = x0;
      positions[destination + 1] = y0;
      positions[destination + 2] = z1;
      break;
    case 3:
      positions[destination] = x1;
      positions[destination + 1] = y0;
      positions[destination + 2] = z1;
      break;
    case 4:
      positions[destination] = x1;
      positions[destination + 1] = y1;
      positions[destination + 2] = z0;
      break;
    case 5:
      positions[destination] = x0;
      positions[destination + 1] = y1;
      positions[destination + 2] = z0;
      break;
    case 6:
      positions[destination] = x0;
      positions[destination + 1] = y0;
      positions[destination + 2] = z0;
      break;
    default:
      positions[destination] = x1;
      positions[destination + 1] = y0;
      positions[destination + 2] = z0;
  }
}

import type { Node } from "../core/Node.ts";
import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Box3 } from "../math/Box3.ts";
import type { Color, ColorValue } from "../math/Color.ts";
import { Sphere } from "../math/Sphere.ts";
import { LineSegments } from "../objects/LineSegments.ts";

// Corner pairs in the order of three.js r186's BoxHelper index buffer, using
// its corner numbering (0 = max corner, 6 = min corner).
const BOX_EDGE_CORNERS = Uint8Array.of(
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  0,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  4,
  0,
  4,
  1,
  5,
  2,
  6,
  3,
  7,
);

const _box = new Box3();

/** Scene node whose world-space box, from `Box3.setFromObject`, the helper draws. */
export type BoxHelperObject = Node;

/** Box3 or scene node accepted as a BoxHelper bounds source. */
export type BoxHelperSource = Box3 | BoxHelperObject;

/** Draws a world-space wireframe box around a scene node or a Box3. */
export class BoxHelper extends LineSegments {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "BoxHelper";

  /** Returns `true` for this concrete type. */
  get isBoxHelper(): true {
    return true;
  }

  #source: BoxHelperSource;
  readonly #boundingSphere = new Sphere();

  /**
   * Constructs a wireframe helper and builds it from the source's world box,
   * as three.js r186 does. The helper is drawn in world space, so its own
   * `matrixAutoUpdate` is `false`.
   */
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
    this.matrixAutoUpdate = false;
    this.update();
  }

  /** Box or scene node read by {@link update}. */
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

  /**
   * Rebuilds the wireframe. A scene-node source is measured with
   * `Box3.setFromObject`, which updates its world matrices first; a Box3
   * source is drawn as is. An empty box leaves the previous wireframe.
   */
  update(): this {
    const source = this.#source;
    const box = source instanceof Box3 ? source : _box.setFromObject(source);
    if (box.isEmpty) return this;
    const position = this.geometry?.getAttribute("position");
    if (!(position?.array instanceof Float32Array)) {
      throw new Error("BoxHelper position storage is unavailable.");
    }
    writeBoxEdges(position.array, box);
    position.needsUpdate = true;
    // The bounding sphere three.js's computeBoundingSphere() finds for the
    // eight corners, written into a reused Sphere instead of a new one.
    const sphere = this.#boundingSphere;
    box.getCenter(sphere.center);
    sphere.radius = sphere.center.distanceTo(box.max);
    if (this.geometry) this.geometry.boundingSphere = sphere;
    return this;
  }

  /** Replaces the scene-node source and rebuilds the wireframe from it. */
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
  if (
    source === undefined ||
    source === null ||
    typeof source !== "object" ||
    typeof source.updateMatrixWorld !== "function"
  ) {
    throw new TypeError("BoxHelper source must be a Box3 or scene node.");
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

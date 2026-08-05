import { Box3 } from "../math/Box3.ts";
import type { ColorValue } from "../math/Color.ts";
import { BoxHelper } from "./BoxHelper.ts";

/** Wireframe helper for a prepared axis-aligned box. */
export class Box3Helper extends BoxHelper {
  /** String identifier used by runtime type checks and serialization. */
  override type = "Box3Helper";

  /** Returns `true` for this concrete type. */
  get isBox3Helper(): true {
    return true;
  }

  /** Constructs a wireframe helper for the supplied axis-aligned box. */
  constructor(box: Box3 = new Box3(), color: ColorValue = 0xffff00) {
    super(box, color);
  }

  /** Box read when {@link update} rebuilds the wireframe. */
  get box(): Box3 {
    return this.source as Box3;
  }

  /** Replaces the box used by the next explicit update. */
  set box(value: Box3) {
    this.source = value;
  }

  /** Returns an independent helper with copied box, geometry, and material state. */
  override clone(): Box3Helper {
    return new Box3Helper(this.box, this.color).copy(this);
  }

  /** Copies transform, box source, geometry, and material state. */
  override copy(source: Box3Helper): this {
    super.copy(source);
    return this;
  }
}

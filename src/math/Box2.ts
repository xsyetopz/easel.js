import { Vector2 } from "./Vector2.ts";

const _v = new Vector2();

/** 2D axis-aligned bounding box. */
export class Box2 {
  /** Type marker identifying Box2 instances. */
  readonly isBox2 = true;

  #min: Vector2 = new Vector2(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  );
  #max: Vector2 = new Vector2(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  );

  /** Constructs an axis-aligned box from optional lower and upper corners. */
  constructor(
    min: Vector2 = new Vector2(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    ),
    max: Vector2 = new Vector2(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ),
  ) {
    this.#min = min.clone();
    this.#max = max.clone();
  }

  /** Lower corner of the box; the returned vector is live. */
  get min(): Vector2 {
    return this.#min;
  }

  /** Copies `value` into the box's lower corner. */
  set min(value: Vector2) {
    this.#min.copy(value);
  }

  /** Upper corner of the box; the returned vector is live. */
  get max(): Vector2 {
    return this.#max;
  }

  /** Copies `value` into the box's upper corner. */
  set max(value: Vector2) {
    this.#max.copy(value);
  }

  /** Replaces all stored components with the supplied values. */
  set(min: Vector2, max: Vector2): this {
    this.#min.copy(min);
    this.#max.copy(max);
    return this;
  }

  /** Returns a new instance with the same component values. */
  clone(): Box2 {
    return new Box2(this.#min, this.#max);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(box: Box2): this {
    this.#min.copy(box.min);
    this.#max.copy(box.max);
    return this;
  }

  /** Resets both corners to the empty-box sentinel bounds. */
  makeEmpty(): this {
    this.#min.set(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    this.#max.set(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    return this;
  }

  /** Returns true when the lower bounds exceed an upper bound. */
  isEmpty(): boolean {
    return this.#max.x < this.#min.x || this.#max.y < this.#min.y;
  }

  /** Writes this box center into `target`. */
  getCenter(target: Vector2): Vector2 {
    return this.isEmpty()
      ? target.set(0, 0)
      : target.set(
          (this.#min.x + this.#max.x) * 0.5,
          (this.#min.y + this.#max.y) * 0.5,
        );
  }

  /** Writes the box width and height into `target`. */
  getSize(target: Vector2): Vector2 {
    return this.isEmpty()
      ? target.set(0, 0)
      : target.set(this.#max.x - this.#min.x, this.#max.y - this.#min.y);
  }

  /**
   * Centers this box on the given point and sets its dimensions.
   *
   * The half-size is computed as scalars so this mutation does not allocate a
   * temporary vector on the call path.
   */
  setFromCenterAndSize(center: Vector2, size: Vector2): this {
    const halfX = size.x * 0.5;
    const halfY = size.y * 0.5;
    this.#min.set(center.x - halfX, center.y - halfY);
    this.#max.set(center.x + halfX, center.y + halfY);
    return this;
  }

  /** Replaces the bounds with the smallest box containing `points`. */
  setFromPoints(points: readonly Vector2[]): this {
    this.makeEmpty();
    for (const point of points) {
      this.expandByPoint(point);
    }
    return this;
  }

  /** Expands the bounds to include `point`. */
  expandByPoint(point: Vector2): this {
    if (point.x < this.#min.x) this.#min.x = point.x;
    if (point.y < this.#min.y) this.#min.y = point.y;
    if (point.x > this.#max.x) this.#max.x = point.x;
    if (point.y > this.#max.y) this.#max.y = point.y;
    return this;
  }

  /** Expands each bound by the corresponding component of `vector`. */
  expandByVector(vector: Vector2): this {
    this.#min.x -= vector.x;
    this.#min.y -= vector.y;
    this.#max.x += vector.x;
    this.#max.y += vector.y;
    return this;
  }

  /** Expands every bound by `scalar` along both axes. */
  expandByScalar(scalar: number): this {
    this.#min.x -= scalar;
    this.#min.y -= scalar;
    this.#max.x += scalar;
    this.#max.y += scalar;
    return this;
  }

  /** Returns true when `point` lies inside or on this box. */
  containsPoint(point: Vector2): boolean {
    return (
      point.x >= this.#min.x &&
      point.x <= this.#max.x &&
      point.y >= this.#min.y &&
      point.y <= this.#max.y
    );
  }

  /** Returns true when the argument box is fully enclosed. */
  containsBox(box: Box2): boolean {
    return (
      this.#min.x <= box.min.x &&
      box.max.x <= this.#max.x &&
      this.#min.y <= box.min.y &&
      box.max.y <= this.#max.y
    );
  }

  /** Writes normalized [0, 1] coordinates for `point` within this box. */
  getParameter(point: Vector2, target: Vector2): Vector2 {
    return target.set(
      (point.x - this.#min.x) / (this.#max.x - this.#min.x),
      (point.y - this.#min.y) / (this.#max.y - this.#min.y),
    );
  }

  /** Returns true when `box` overlaps this two-dimensional box. */
  intersectsBox(box: Box2): boolean {
    return !(
      box.max.x < this.#min.x ||
      box.min.x > this.#max.x ||
      box.max.y < this.#min.y ||
      box.min.y > this.#max.y
    );
  }

  /** Writes `point` clamped to this box into `target`. */
  clampPoint(point: Vector2, target: Vector2): Vector2 {
    return target.set(
      Math.max(this.#min.x, Math.min(this.#max.x, point.x)),
      Math.max(this.#min.y, Math.min(this.#max.y, point.y)),
    );
  }

  /** Returns the Euclidean distance from this box to `point`. */
  distanceToPoint(point: Vector2): number {
    this.clampPoint(point, _v);
    _v.sub(point);
    return Math.sqrt(_v.x * _v.x + _v.y * _v.y);
  }

  /** Replaces this box with its intersection with `box`. */
  intersect(box: Box2): this {
    this.#min.x = Math.max(this.#min.x, box.min.x);
    this.#min.y = Math.max(this.#min.y, box.min.y);
    this.#max.x = Math.min(this.#max.x, box.max.x);
    this.#max.y = Math.min(this.#max.y, box.max.y);
    if (this.isEmpty()) this.makeEmpty();
    return this;
  }

  /** Expands this box to contain another. */
  union(box: Box2): this {
    this.#min.x = Math.min(this.#min.x, box.min.x);
    this.#min.y = Math.min(this.#min.y, box.min.y);
    this.#max.x = Math.max(this.#max.x, box.max.x);
    this.#max.y = Math.max(this.#max.y, box.max.y);
    return this;
  }

  /** Translates both corners by `offset` in place. */
  translate(offset: Vector2): this {
    this.#min.add(offset);
    this.#max.add(offset);
    return this;
  }

  /** Returns true when both corners exactly match `box`. */
  equals(box: Box2): boolean {
    return box.min.equals(this.#min) && box.max.equals(this.#max);
  }
}

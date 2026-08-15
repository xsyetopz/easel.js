import { Plane } from "./Plane.ts";

/** Six-plane view frustum for visibility culling. */
export class Frustum {
  /** Plane order: left, right, bottom, top, near, then far. */
  planes: Plane[] = [];

  /** Constructs a frustum with six reusable clipping planes. */
  constructor() {
    this.planes.push(new Plane());
    this.planes.push(new Plane());
    this.planes.push(new Plane());
    this.planes.push(new Plane());
    this.planes.push(new Plane());
    this.planes.push(new Plane());
  }

  /**
   * Copies six planes into this frustum.
   *
   * Omitting a plane resets that slot to a fresh default plane. The defaults
   * are evaluated only when this method is called, so the render loop does not
   * pay for any extra allocations while the frustum is reused.
   */
  /** Copies an array of up to six clipping planes into this frustum. */
  set(planes: Plane[]): this;
  /** Copies variadic clipping planes into this frustum. */
  set(...planes: Plane[]): this;
  /** Copies supplied planes and resets omitted slots to defaults. */
  set(planes: Plane | Plane[], ...rest: Plane[]): this {
    const src: Plane[] = Array.isArray(planes) ? planes : [planes, ...rest];
    const defaults = [
      new Plane(),
      new Plane(),
      new Plane(),
      new Plane(),
      new Plane(),
      new Plane(),
    ];
    for (let i = 0; i < 6; i++) {
      this.planes[i].copy(src[i] ?? defaults[i]);
    }
    return this;
  }

  /** Returns a new instance with the same component values. */
  clone(): Frustum {
    return new Frustum().copy(this);
  }

  /** Returns true when `point` lies inside all six clipping half-spaces. */
  containsPoint(point: { x: number; y: number; z: number }): boolean {
    const planes = this.planes;
    if (planes[0].distanceToPoint(point) < 0) return false;
    if (planes[1].distanceToPoint(point) < 0) return false;
    if (planes[2].distanceToPoint(point) < 0) return false;
    if (planes[3].distanceToPoint(point) < 0) return false;
    if (planes[4].distanceToPoint(point) < 0) return false;
    if (planes[5].distanceToPoint(point) < 0) return false;
    return true;
  }

  /** Copies component values from the supplied instance into this one. */
  copy(frustum: Frustum): this {
    const planes = this.planes;
    planes[0].copy(frustum.planes[0]);
    planes[1].copy(frustum.planes[1]);
    planes[2].copy(frustum.planes[2]);
    planes[3].copy(frustum.planes[3]);
    planes[4].copy(frustum.planes[4]);
    planes[5].copy(frustum.planes[5]);
    return this;
  }

  /** Returns true when `box` intersects the frustum volume. */
  intersectsBox(box: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  }): boolean {
    const planes = this.planes;

    for (let i = 0; i < 6; i++) {
      const plane = planes[i];
      const normal = plane.normal;

      const px = normal.x > 0 ? box.max.x : box.min.x;
      const py = normal.y > 0 ? box.max.y : box.min.y;
      const pz = normal.z > 0 ? box.max.z : box.min.z;

      if (plane.distanceToPoint({ x: px, y: py, z: pz }) < 0) {
        return false;
      }
    }

    return true;
  }

  /** Returns true when `sphere` intersects the frustum volume. */
  intersectsSphere(sphere: {
    centre: { x: number; y: number; z: number };
    radius: number;
  }): boolean {
    const planes = this.planes;
    const centre = sphere.centre;
    const negRadius = -sphere.radius;

    for (let i = 0; i < 6; i++) {
      const distance = planes[i].distanceToPoint(centre);
      if (distance < negRadius) return false;
    }

    return true;
  }

  /** Replaces all six planes with default planes. */
  makeEmpty(): this {
    for (let i = 0; i < 6; i++) {
      this.planes[i] = new Plane();
    }
    return this;
  }

  /**
   * Extracts the six frustum planes from a combined projection matrix.
   * Uses the Gribb/Hartmann method (column-major layout).
   */
  setFromProjectionMatrix(m: { elements: ArrayLike<number> }): this {
    const me = m.elements;
    const planes = this.planes;

    const me0 = me[0];
    const me1 = me[1];
    const me2 = me[2];
    const me3 = me[3];
    const me4 = me[4];
    const me5 = me[5];
    const me6 = me[6];
    const me7 = me[7];
    const me8 = me[8];
    const me9 = me[9];
    const me10 = me[10];
    const me11 = me[11];
    const me12 = me[12];
    const me13 = me[13];
    const me14 = me[14];
    const me15 = me[15];

    planes[0]
      .setComponents(me3 - me0, me7 - me4, me11 - me8, me15 - me12)
      .normalize(); /* left */
    planes[1]
      .setComponents(me3 + me0, me7 + me4, me11 + me8, me15 + me12)
      .normalize(); /* right */
    planes[2]
      .setComponents(me3 + me1, me7 + me5, me11 + me9, me15 + me13)
      .normalize(); /* bottom */
    planes[3]
      .setComponents(me3 - me1, me7 - me5, me11 - me9, me15 - me13)
      .normalize(); /* top */
    planes[4]
      .setComponents(me3 - me2, me7 - me6, me11 - me10, me15 - me14)
      .normalize(); /* near */
    planes[5]
      .setComponents(me3 + me2, me7 + me6, me11 + me10, me15 + me14)
      .normalize(); /* far */
    return this;
  }
}

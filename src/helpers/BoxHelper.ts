import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { LineSegments } from "../objects/LineSegments.ts";

interface BoxLikeObject {
  geometry?: {
    boundingBox?: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
  };
}

/** Draws a wireframe box around an object's bounding box. */
export class BoxHelper extends LineSegments {
  override type = "BoxHelper";

  #object: BoxLikeObject;

  constructor(object: BoxLikeObject, color = 0xffff00) {
    const geometry = new Geometry();
    const material = new LineMaterial({ color });

    // 12 edges x 2 vertices = 24 positions (placeholder, filled by update())
    geometry.setAttribute(
      "position",
      new Attribute(new Float32Array(24 * 3), 3),
    );

    super(geometry, material);

    this.#object = object;
    this.update();
  }

  /** Recomputes the wireframe from the object's bounding box. */
  update(): void {
    this.setFromObject(this.#object);
  }

  setFromObject(object: BoxLikeObject): this {
    if (!object?.geometry) return this;

    const box = object.geometry.boundingBox;
    if (!box) return this;

    const min = box.min;
    const max = box.max;

    // 8 corners of the box
    const x0 = min.x;
    const y0 = min.y;
    const z0 = min.z;
    const x1 = max.x;
    const y1 = max.y;
    const z1 = max.z;

    // 12 edges as line segment pairs (24 vertices)
    const positions = new Float32Array([
      // bottom face
      x0,
      y0,
      z0,
      x1,
      y0,
      z0,
      x1,
      y0,
      z0,
      x1,
      y0,
      z1,
      x1,
      y0,
      z1,
      x0,
      y0,
      z1,
      x0,
      y0,
      z1,
      x0,
      y0,
      z0,
      // top face
      x0,
      y1,
      z0,
      x1,
      y1,
      z0,
      x1,
      y1,
      z0,
      x1,
      y1,
      z1,
      x1,
      y1,
      z1,
      x0,
      y1,
      z1,
      x0,
      y1,
      z1,
      x0,
      y1,
      z0,
      // verticals
      x0,
      y0,
      z0,
      x0,
      y1,
      z0,
      x1,
      y0,
      z0,
      x1,
      y1,
      z0,
      x1,
      y0,
      z1,
      x1,
      y1,
      z1,
      x0,
      y0,
      z1,
      x0,
      y1,
      z1,
    ]);

    this.geometry?.setAttribute("position", new Attribute(positions, 3));

    return this;
  }

  dispose(): void {
    this.geometry?.dispose();
  }
}

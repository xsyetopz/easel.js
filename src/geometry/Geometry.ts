import { Sphere } from "../math/Sphere.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Attribute } from "./Attribute.ts";

let _geometryId = 0;

/**
 * Vertex data store. Per-vertex color is a first-class shading path,
 * not an afterthought.
 */
export class Geometry {
  id = _geometryId++;
  name = "";
  type = "Geometry";
  parameters: Record<string, unknown> = {};
  #attributes = new Map<string, Attribute>();
  #index: Uint16Array | Uint32Array | undefined = undefined;
  boundingBox: unknown = undefined;
  boundingSphere: Sphere | undefined = undefined;

  /** Sets the position attribute from a flat array of xyz values. */
  setPositions(array: Float32Array | number[]): this {
    const data =
      array instanceof Float32Array ? array : new Float32Array(array);
    this.#attributes.set("position", new Attribute(data, 3));
    return this;
  }

  /** Sets the uv attribute from a flat array of uv pairs. */
  setUVs(array: Float32Array | number[]): this {
    const data =
      array instanceof Float32Array ? array : new Float32Array(array);
    this.#attributes.set("uv", new Attribute(data, 2));
    return this;
  }

  /** Per-vertex color. First-class alongside positions and UVs. */
  setColors(array: Float32Array | number[]): this {
    const data =
      array instanceof Float32Array ? array : new Float32Array(array);
    this.#attributes.set("color", new Attribute(data, 3));
    return this;
  }

  /** Sets the normal attribute from a flat array of normal xyz triples. */
  setNormals(array: Float32Array | number[]): this {
    const data =
      array instanceof Float32Array ? array : new Float32Array(array);
    this.#attributes.set("normal", new Attribute(data, 3));
    return this;
  }

  /** Sets the triangle index list. */
  setIndex(array: Uint16Array | Uint32Array | number[]): this {
    if (array instanceof Uint16Array || array instanceof Uint32Array) {
      this.#index = array;
    } else {
      this.#index =
        array.length > 65535 ? new Uint32Array(array) : new Uint16Array(array);
    }
    return this;
  }

  getAttribute(name: string): Attribute | undefined {
    return this.#attributes.get(name);
  }

  setAttribute(name: string, attribute: Attribute): this {
    this.#attributes.set(name, attribute);
    return this;
  }

  deleteAttribute(name: string): boolean {
    return this.#attributes.delete(name);
  }

  get index(): Uint16Array | Uint32Array | undefined {
    return this.#index;
  }

  get attributes(): Map<string, Attribute> {
    return this.#attributes;
  }

  /** Compute flat (cross-product per face) vertex normals. */
  computeVertexNormals(): this {
    const posAttr = this.#attributes.get("position");
    if (!posAttr) return this;

    const positions = posAttr.array;
    const normals = new Float32Array(positions.length);
    const index = this.#index;

    const pA = new Vector3();
    const pB = new Vector3();
    const pC = new Vector3();
    const cb = new Vector3();
    const ab = new Vector3();

    if (index) {
      for (let i = 0; i < index.length; i += 3) {
        const a = index[i] * 3;
        const b = index[i + 1] * 3;
        const c = index[i + 2] * 3;

        pA.set(positions[a], positions[a + 1], positions[a + 2]);
        pB.set(positions[b], positions[b + 1], positions[b + 2]);
        pC.set(positions[c], positions[c + 1], positions[c + 2]);

        cb.copy(pC).sub(pB);
        ab.copy(pA).sub(pB);
        cb.cross(ab);

        normals[a] += cb.x;
        normals[a + 1] += cb.y;
        normals[a + 2] += cb.z;
        normals[b] += cb.x;
        normals[b + 1] += cb.y;
        normals[b + 2] += cb.z;
        normals[c] += cb.x;
        normals[c + 1] += cb.y;
        normals[c + 2] += cb.z;
      }
    } else {
      for (let i = 0; i < positions.length; i += 9) {
        pA.set(positions[i], positions[i + 1], positions[i + 2]);
        pB.set(positions[i + 3], positions[i + 4], positions[i + 5]);
        pC.set(positions[i + 6], positions[i + 7], positions[i + 8]);

        cb.copy(pC).sub(pB);
        ab.copy(pA).sub(pB);
        cb.cross(ab);

        normals[i] = cb.x;
        normals[i + 1] = cb.y;
        normals[i + 2] = cb.z;
        normals[i + 3] = cb.x;
        normals[i + 4] = cb.y;
        normals[i + 5] = cb.z;
        normals[i + 6] = cb.x;
        normals[i + 7] = cb.y;
        normals[i + 8] = cb.z;
      }
    }

    // normalize
    const nv = new Vector3();
    for (let i = 0; i < normals.length; i += 3) {
      nv.set(normals[i], normals[i + 1], normals[i + 2]).normalize();
      normals[i] = nv.x;
      normals[i + 1] = nv.y;
      normals[i + 2] = nv.z;
    }

    this.#attributes.set("normal", new Attribute(normals, 3));
    return this;
  }

  /** Computes a minimal bounding sphere from the position attribute. */
  computeBoundingSphere(): this {
    const posAttr = this.#attributes.get("position");
    if (!posAttr) return this;
    const arr = posAttr.array;
    const itemSize = posAttr.itemSize;
    const count = arr.length / itemSize;
    if (count === 0) {
      this.boundingSphere = new Sphere(new Vector3(0, 0, 0), 0);
      return this;
    }

    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < count; i++) {
      cx += arr[i * itemSize];
      cy += arr[i * itemSize + 1];
      cz += arr[i * itemSize + 2];
    }
    cx /= count;
    cy /= count;
    cz /= count;

    let maxRadiusSq = 0;
    for (let i = 0; i < count; i++) {
      const dx = arr[i * itemSize] - cx;
      const dy = arr[i * itemSize + 1] - cy;
      const dz = arr[i * itemSize + 2] - cz;
      maxRadiusSq = Math.max(maxRadiusSq, dx * dx + dy * dy + dz * dz);
    }

    this.boundingSphere = new Sphere(
      new Vector3(cx, cy, cz),
      Math.sqrt(maxRadiusSq),
    );
    return this;
  }

  dispose(): void {
    this.#attributes.clear();
    this.#index = undefined;
  }
}

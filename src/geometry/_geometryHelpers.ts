import type { AttributeArray } from "./Attribute.ts";
import { Attribute } from "./Attribute.ts";
import type { Sphere } from "../math/Sphere.ts";
import { Vector3 } from "../math/Vector3.ts";

type TypedArrayConstructor = new (length: number) => AttributeArray;

/** JSON representation of geometry attributes, indices, ranges, and bounds. */
export type GeometryDataJSON = {
  attributes: Record<string, ReturnType<Attribute["toJSON"]>>;
  index?: { type: string; array: number[] };
  drawRange: { start: number; count: number };
  morphAttributes?: Record<string, ReturnType<Attribute["toJSON"]>[]>;
  morphTargetsRelative?: boolean;
  boundingSphere?: { center: [number, number, number]; radius: number };
};

/** Serializes the supplied geometry state for storage or transfer. */
export function buildGeometryData(opts: {
  attributes: ReadonlyMap<string, Attribute>;
  index: Uint16Array | Uint32Array | undefined;
  drawRange: { start: number; count: number };
  morphAttributes?: Record<string, Attribute[]>;
  morphTargetsRelative: boolean;
  boundingSphere: Sphere | undefined;
}): GeometryDataJSON {
  const data: GeometryDataJSON = {
    attributes: {},
    drawRange: { ...opts.drawRange },
  };

  for (const [name, attribute] of opts.attributes) {
    data.attributes[name] = attribute.toJSON();
  }

  if (opts.index) {
    data.index = {
      type: opts.index.constructor.name,
      array: Array.from(opts.index),
    };
  }

  if (opts.morphAttributes) {
    data.morphAttributes = {};
    data.morphTargetsRelative = opts.morphTargetsRelative;
    for (const [name, attrs] of Object.entries(opts.morphAttributes)) {
      data.morphAttributes[name] = attrs.map((attr) => attr.toJSON());
    }
  }

  if (opts.boundingSphere) {
    const c = opts.boundingSphere.center;
    data.boundingSphere = {
      center: [c.x, c.y, c.z],
      radius: opts.boundingSphere.radius,
    };
  }

  return data;
}

/** Computes per-face normal data from positions and optional index buffer. */
export function computeVertexNormalsData(
  positions: ArrayLike<number>,
  index?: Uint16Array | Uint32Array,
): Float32Array {
  const normals = new Float32Array(positions.length);
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

  const nv = new Vector3();
  for (let i = 0; i < normals.length; i += 3) {
    nv.set(normals[i], normals[i + 1], normals[i + 2]).normalize();
    normals[i] = nv.x;
    normals[i + 1] = nv.y;
    normals[i + 2] = nv.z;
  }

  return normals;
}

interface TangentAccumulationState {
  position: Attribute;
  uv: Attribute;
  tan1: Vector3[];
  tan2: Vector3[];
  vertexCount: number;
  pA: Vector3;
  pB: Vector3;
  pC: Vector3;
  uvA: Vector3;
  uvB: Vector3;
  uvC: Vector3;
  edge1: Vector3;
  edge2: Vector3;
  sdir: Vector3;
  tdir: Vector3;
}

function handleTriangle(
  state: TangentAccumulationState,
  a: number,
  b: number,
  c: number,
): void {
  const isValidVertex = (i: number): boolean =>
    Number.isInteger(i) && i >= 0 && i < state.vertexCount;

  if (!(isValidVertex(a) && isValidVertex(b) && isValidVertex(c))) {
    return;
  }

  state.pA.set(
    state.position.getX(a),
    state.position.getY(a),
    state.position.getZ(a),
  );
  state.pB.set(
    state.position.getX(b),
    state.position.getY(b),
    state.position.getZ(b),
  );
  state.pC.set(
    state.position.getX(c),
    state.position.getY(c),
    state.position.getZ(c),
  );
  state.uvA.set(state.uv.getX(a), state.uv.getY(a), 0);
  state.uvB.set(state.uv.getX(b), state.uv.getY(b), 0);
  state.uvC.set(state.uv.getX(c), state.uv.getY(c), 0);
  state.edge1.copy(state.pB).sub(state.pA);
  state.edge2.copy(state.pC).sub(state.pA);
  const du1 = state.uvB.x - state.uvA.x;
  const dv1 = state.uvB.y - state.uvA.y;
  const du2 = state.uvC.x - state.uvA.x;
  const dv2 = state.uvC.y - state.uvA.y;
  const determinant = du1 * dv2 - du2 * dv1;
  if (
    !Number.isFinite(determinant) ||
    Math.abs(determinant) <= Number.EPSILON
  ) {
    return;
  }

  const reciprocal = 1 / determinant;
  state.sdir
    .copy(state.edge1)
    .multiplyScalar(dv2)
    .addScaledVector(state.edge2, -dv1)
    .multiplyScalar(reciprocal);
  state.tdir
    .copy(state.edge2)
    .multiplyScalar(du1)
    .addScaledVector(state.edge1, -du2)
    .multiplyScalar(reciprocal);
  state.tan1[a].add(state.sdir);
  state.tan1[b].add(state.sdir);
  state.tan1[c].add(state.sdir);
  state.tan2[a].add(state.tdir);
  state.tan2[b].add(state.tdir);
  state.tan2[c].add(state.tdir);
}

function accumulateTangentTriangles(
  state: TangentAccumulationState,
  index?: Uint16Array | Uint32Array,
): void {
  if (index) {
    for (let i = 0; i + 2 < index.length; i += 3) {
      handleTriangle(
        state,
        index[i] ?? -1,
        index[i + 1] ?? -1,
        index[i + 2] ?? -1,
      );
    }
  } else {
    for (let i = 0; i + 2 < state.vertexCount; i += 3) {
      handleTriangle(state, i, i + 1, i + 2);
    }
  }
}

interface TangentFinalizationState {
  tan1: Vector3[];
  tan2: Vector3[];
  normal: Attribute;
  vertexCount: number;
  tangent: Float32Array;
}

function finalizeTangents(state: TangentFinalizationState): void {
  const normalVector = new Vector3();
  const normalCopy = new Vector3();
  const orthogonal = new Vector3();
  const handednessVector = new Vector3();
  for (let i = 0; i < state.vertexCount; i++) {
    const tangentVector = state.tan1[i] ?? new Vector3();
    const bitangentVector = state.tan2[i] ?? new Vector3();
    normalVector.set(
      state.normal.getX(i),
      state.normal.getY(i),
      state.normal.getZ(i),
    );
    normalCopy.copy(normalVector);
    orthogonal
      .copy(tangentVector)
      .sub(normalVector.multiplyScalar(normalCopy.dot(tangentVector)))
      .normalize();
    const handedness =
      handednessVector
        .crossVectors(normalCopy, tangentVector)
        .dot(bitangentVector) < 0
        ? -1
        : 1;
    const offset = i * 4;
    state.tangent[offset] = orthogonal.x;
    state.tangent[offset + 1] = orthogonal.y;
    state.tangent[offset + 2] = orthogonal.z;
    state.tangent[offset + 3] = handedness;
  }
}

/** Computes per-vertex UV tangents and handedness. Returns `undefined` if inputs are insufficient. */
export function computeTangentsData(
  position: Attribute,
  normal: Attribute,
  uv: Attribute,
  index?: Uint16Array | Uint32Array,
): Float32Array | undefined {
  const vertexCount = position.count;
  if (normal.count < vertexCount || uv.count < vertexCount) return;

  const tangent = new Float32Array(vertexCount * 4);
  const tan1 = Array.from({ length: vertexCount }, () => new Vector3());
  const tan2 = Array.from({ length: vertexCount }, () => new Vector3());

  const accState: TangentAccumulationState = {
    position,
    uv,
    tan1,
    tan2,
    vertexCount,
    pA: new Vector3(),
    pB: new Vector3(),
    pC: new Vector3(),
    uvA: new Vector3(),
    uvB: new Vector3(),
    uvC: new Vector3(),
    edge1: new Vector3(),
    edge2: new Vector3(),
    sdir: new Vector3(),
    tdir: new Vector3(),
  };

  accumulateTangentTriangles(accState, index);

  finalizeTangents({ tan1, tan2, normal, vertexCount, tangent });

  return tangent;
}

/** Computes bounding sphere center and radius from a position array. */
export function computeBoundingSphereData(
  arr: ArrayLike<number>,
  itemSize: number,
): { center: Vector3; radius: number } {
  const count = arr.length / itemSize;
  if (count === 0) {
    return { center: new Vector3(0, 0, 0), radius: 0 };
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

  return { center: new Vector3(cx, cy, cz), radius: Math.sqrt(maxRadiusSq) };
}

/** Merges duplicate vertices within `mergeThreshold`. Returns `undefined` if no merging needed. */
export function mergeVerticesData(
  position: Attribute,
  mergeThreshold: number,
): { remap: number[]; uniqueOldIndices: number[] } | undefined {
  const thresholdSq = mergeThreshold * mergeThreshold;
  const vertexCount = position.count;
  const remap: number[] = [];
  const uniqueOldIndices: number[] = [];

  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);

    let matchIndex = -1;
    for (let j = 0; j < uniqueOldIndices.length; j++) {
      const u = uniqueOldIndices[j] ?? 0;
      const dx = position.getX(u) - x;
      const dy = position.getY(u) - y;
      const dz = position.getZ(u) - z;
      if (dx * dx + dy * dy + dz * dz <= thresholdSq) {
        matchIndex = j;
        break;
      }
    }

    if (matchIndex >= 0) {
      remap.push(matchIndex);
    } else {
      remap.push(uniqueOldIndices.length);
      uniqueOldIndices.push(i);
    }
  }

  if (uniqueOldIndices.length === vertexCount) return;

  return { remap, uniqueOldIndices };
}

/** Merges attribute data according to unique old indices. */
export function mergeAttributeData(
  attribute: Attribute,
  uniqueOldIndices: number[],
): Attribute {
  const itemSize = attribute.itemSize;
  const newArray = new (attribute.array.constructor as TypedArrayConstructor)(
    uniqueOldIndices.length * itemSize,
  );
  const merged = new Attribute(newArray, itemSize, attribute.normalized);
  merged.name = attribute.name;
  for (let newIndex = 0; newIndex < uniqueOldIndices.length; newIndex++) {
    merged.copyAt(newIndex, attribute, uniqueOldIndices[newIndex] ?? 0);
  }
  return merged;
}

/** Expands an indexed attribute into a non-indexed attribute. */
export function expandAttribute(
  attribute: Attribute,
  index: Uint16Array | Uint32Array,
  name: string,
): Attribute {
  const array = new (attribute.array.constructor as TypedArrayConstructor)(
    index.length * attribute.itemSize,
  );
  const expanded = new Attribute(
    array,
    attribute.itemSize,
    attribute.normalized,
  );
  expanded.name = attribute.name;
  expanded.needsUpdate = attribute.needsUpdate;
  for (let item = 0; item < index.length; item++) {
    const sourceIndex = index[item];
    if (sourceIndex < 0 || sourceIndex >= attribute.count) {
      throw new RangeError(
        `Geometry.toNonIndexed(): index ${sourceIndex} exceeds ${name} attribute count`,
      );
    }
    expanded.copyAt(item, attribute, sourceIndex);
  }
  return expanded;
}

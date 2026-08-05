import { defined } from "./defined.js";
import { compareArrays } from "./three-bridge.js";

export type AttributeLike = {
  array: ArrayLike<number>;
  count?: number;
  itemSize?: number;
};

export type GeometryLike = {
  index?: ArrayLike<number> | undefined;
  getAttribute(name: string): AttributeLike | null | undefined;
};

export type THREEGeometryLike = {
  getAttribute(name: string): AttributeLike | null | undefined;
  getIndex(): AttributeLike | null | undefined;
};

export function getAttribute(
  geometry: GeometryLike | THREEGeometryLike,
  name: string,
): AttributeLike {
  return defined(geometry.getAttribute(name), `${name} attribute`);
}

export function getAttributeArray(
  geometry: GeometryLike | THREEGeometryLike,
  name: string,
): ArrayLike<number> {
  return getAttribute(geometry, name).array;
}

export function getAttributeCount(
  geometry: GeometryLike | THREEGeometryLike,
  name: string,
): number {
  return defined(getAttribute(geometry, name).count, `${name} count`);
}

export function getIndexArray(geometry: GeometryLike | THREEGeometryLike) {
  if ("getIndex" in geometry)
    return defined(geometry.getIndex(), "index").array;
  return defined(geometry.index, "index");
}

export function expectAttributeArraysClose(
  EASELGeometry: GeometryLike,
  THREEGeometry: THREEGeometryLike,
  name: string,
  epsilon = 1e-4,
): void {
  const { pass, failures } = compareArrays(
    getAttributeArray(EASELGeometry, name),
    getAttributeArray(THREEGeometry, name),
    epsilon,
  );
  if (!pass) {
    throw new Error(failures.join(", "));
  }
}

export function expectIndexLengthMatches(
  EASELGeometry: GeometryLike,
  THREEGeometry: THREEGeometryLike,
): void {
  const EASELLength = getIndexArray(EASELGeometry).length;
  const THREELength = getIndexArray(THREEGeometry).length;
  if (EASELLength !== THREELength) {
    throw new Error(`index length ${EASELLength} vs ${THREELength}`);
  }
}

export function expectUnitNormals(
  normals: ArrayLike<number>,
  precision = 4,
  limit = 30,
): void {
  for (let i = 0; i < Math.min(normals.length, limit); i += 3) {
    const length = Math.sqrt(
      normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2,
    );
    const tolerance = 0.5 * 10 ** -precision;
    if (Math.abs(length - 1) >= tolerance) {
      throw new Error(`normal length ${length} at ${i}`);
    }
  }
}

export function maxVertexRadius(positions: ArrayLike<number>): number {
  let maxRadius = 0;
  for (let i = 0; i < positions.length; i += 3) {
    const radius = Math.sqrt(
      positions[i] ** 2 + positions[i + 1] ** 2 + positions[i + 2] ** 2,
    );
    if (radius > maxRadius) maxRadius = radius;
  }
  return maxRadius;
}

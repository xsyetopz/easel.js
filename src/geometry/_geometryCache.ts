import type { Geometry } from "./Geometry.ts";

type GeometryCacheInvalidator = () => void;

const _cacheInvalidators = new WeakMap<
  Geometry,
  Set<WeakRef<GeometryCacheInvalidator>>
>();

/** Registers a callback that runs when this geometry invalidates derived caches. */
export function registerGeometryCacheInvalidator(
  geometry: Geometry,
  invalidator: GeometryCacheInvalidator,
): void {
  let invalidators = _cacheInvalidators.get(geometry);
  if (!invalidators) {
    invalidators = new Set();
    _cacheInvalidators.set(geometry, invalidators);
  }
  for (const reference of invalidators) {
    if (reference.deref() === invalidator) return;
  }
  invalidators.add(new WeakRef(invalidator));
}

/** Removes a previously registered geometry cache invalidation callback. */
export function unregisterGeometryCacheInvalidator(
  geometry: Geometry,
  invalidator: GeometryCacheInvalidator,
): void {
  const invalidators = _cacheInvalidators.get(geometry);
  if (!invalidators) return;
  for (const reference of invalidators) {
    const current = reference.deref();
    if (!current || current === invalidator) invalidators.delete(reference);
  }
  if (invalidators.size === 0) _cacheInvalidators.delete(geometry);
}

/** Notifies live listeners that derived geometry caches are stale. */
export function invalidateGeometryCaches(geometry: Geometry): void {
  const invalidators = _cacheInvalidators.get(geometry);
  if (!invalidators) return;
  for (const reference of invalidators) {
    const invalidator = reference.deref();
    if (invalidator) invalidator();
    else invalidators.delete(reference);
  }
  if (invalidators.size === 0) _cacheInvalidators.delete(geometry);
}

type Constructable<T> = new (...args: unknown[]) => T;

export function createPair<EASEL, THREE>(
  EASELClass: Constructable<EASEL>,
  THREEClass: Constructable<THREE>,
  ...args: unknown[]
): { EASEL: EASEL; THREE: THREE } {
  return { EASEL: new EASELClass(...args), THREE: new THREEClass(...args) };
}

export function seededRandom(seed = 42): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

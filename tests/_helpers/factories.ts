type Constructable<T> = new (...args: unknown[]) => T;

export function createPair<Easel, Three>(
	EaselClass: Constructable<Easel>,
	ThreeClass: Constructable<Three>,
	...args: unknown[]
): { easel: Easel; three: Three } {
	return { easel: new EaselClass(...args), three: new ThreeClass(...args) };
}

export function seededRandom(seed = 42): () => number {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) & 0xffffffff;
		return (s >>> 0) / 0xffffffff;
	};
}

export function createPair(EaselClass, ThreeClass, ...args) {
	return { easel: new EaselClass(...args), three: new ThreeClass(...args) };
}

export function seededRandom(seed = 42) {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) & 0xffffffff;
		return (s >>> 0) / 0xffffffff;
	};
}

export function nearEqual(a, b, epsilon = 1e-6) {
	return Math.abs(a - b) < epsilon;
}

export function compareArrays(easelArr, threeArr, epsilon = 1e-6) {
	if (easelArr.length !== threeArr.length) {
		return {
			pass: false,
			failures: [`length ${easelArr.length} vs ${threeArr.length}`],
		};
	}
	const failures: string[] = [];
	for (let i = 0; i < easelArr.length; i++) {
		if (Math.abs(easelArr[i] - threeArr[i]) >= epsilon) {
			failures.push(`[${i}]: ${easelArr[i]} vs ${threeArr[i]}`);
		}
	}
	return { pass: failures.length === 0, failures };
}

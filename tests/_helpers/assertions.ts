import { expect } from "vitest";

expect.extend({
	toMatchVector(received, expected, epsilon = 1e-6) {
		const keys = ["x", "y", "z", "w"];
		const mismatches = [];
		for (const k of keys) {
			if (k in expected) {
				const r = received[k] ?? 0;
				const e = expected[k] ?? 0;
				if (Math.abs(r - e) >= epsilon) {
					mismatches.push(`${k}: ${r} vs ${e}`);
				}
			}
		}
		return {
			pass: mismatches.length === 0,
			message: () => `Vector mismatch: ${mismatches.join(", ")}`,
		};
	},
	toMatchMatrix(received, expected, epsilon = 1e-6) {
		const re = received.elements ?? received;
		const te = expected.elements ?? expected;
		const mismatches = [];
		for (let i = 0; i < re.length; i++) {
			if (Math.abs(re[i] - te[i]) >= epsilon) {
				mismatches.push(`[${i}]: ${re[i]} vs ${te[i]}`);
			}
		}
		return {
			pass: mismatches.length === 0,
			message: () => `Matrix mismatch: ${mismatches.join(", ")}`,
		};
	},
});

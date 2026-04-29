// biome-ignore lint/correctness/noUndeclaredDependencies: module augmentation target lives under vitest
import "@vitest/expect";
import "vitest";

type VectorLike = Partial<Record<"x" | "y" | "z" | "w", number>>;
type MatrixLike = { elements?: ArrayLike<number> } | ArrayLike<number>;

declare module "@vitest/expect" {
	interface Assertion<T> {
		toMatchVector(expected: VectorLike, epsilon?: number): void;
		toMatchMatrix(expected: MatrixLike, epsilon?: number): void;
	}
	interface AsymmetricMatchersContaining {
		toMatchVector(expected: VectorLike, epsilon?: number): void;
		toMatchMatrix(expected: MatrixLike, epsilon?: number): void;
	}
}

declare module "vitest" {
	interface Assertion<T> {
		toMatchVector(expected: VectorLike, epsilon?: number): void;
		toMatchMatrix(expected: MatrixLike, epsilon?: number): void;
	}
	interface AsymmetricMatchersContaining {
		toMatchVector(expected: VectorLike, epsilon?: number): void;
		toMatchMatrix(expected: MatrixLike, epsilon?: number): void;
	}
}

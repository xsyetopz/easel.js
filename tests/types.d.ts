import "bun:test";

type VectorLike = Partial<Record<"x" | "y" | "z" | "w", number>>;
type MatrixLike = { elements?: ArrayLike<number> } | ArrayLike<number>;

declare module "bun:test" {
	interface Matchers<T> {
		toBe(expected: unknown): void;
		toHaveBeenCalledOnce(): void;
		toMatchVector(expected: VectorLike, epsilon?: number): void;
		toMatchMatrix(expected: MatrixLike, epsilon?: number): void;
	}
	interface AsymmetricMatchers {
		toMatchVector(expected: VectorLike, epsilon?: number): void;
		toMatchMatrix(expected: MatrixLike, epsilon?: number): void;
	}
}

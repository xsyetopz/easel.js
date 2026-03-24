import type { DrawCall } from "./DrawCall.ts";

/** Growable list of DrawCalls collected during scene traversal. */
export class DrawList {
	#calls: DrawCall[] = [];

	/** Lights collected during scene traversal. */
	lights: Record<string, unknown>[] = [];

	get calls(): DrawCall[] {
		return this.#calls;
	}

	get length(): number {
		return this.#calls.length;
	}

	add(drawCall: DrawCall): void {
		this.#calls.push(drawCall);
	}

	clear(): void {
		this.#calls.length = 0;
		this.lights.length = 0;
	}

	[Symbol.iterator](): Iterator<DrawCall> {
		return this.#calls[Symbol.iterator]();
	}
}

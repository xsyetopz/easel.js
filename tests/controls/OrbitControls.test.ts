import { describe, expect, it, vi } from "vitest";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { OrbitControls } from "@/controls/OrbitControls.js";
import { Vector3 } from "@/math/Vector3.js";

type MockEvent = Event & Record<string, unknown>;
type MockListener = (event: MockEvent) => void;
type MockElement = EventTarget & {
	style: CSSStyleDeclaration;
	setPointerCapture: (id: number) => void;
	releasePointerCapture: (id: number) => void;
	_fire: (type: string, event: Record<string, unknown>) => void;
	_listenerCount: (type: string) => number;
};

/** Minimal DOM element mock. Tracks registered listeners so tests can fire synthetic events without a real browser. */
function mockElement(): MockElement {
	const listeners: Record<string, MockListener[]> = {};
	return {
		addEventListener(type: string, fn: EventListenerOrEventListenerObject) {
			const listener: MockListener =
				typeof fn === "function"
					? (fn as MockListener)
					: (event) => fn.handleEvent(event);
			listeners[type] ??= [];
			listeners[type].push(listener);
		},
		removeEventListener(type: string, fn: EventListenerOrEventListenerObject) {
			const listener: MockListener =
				typeof fn === "function"
					? (fn as MockListener)
					: (event) => fn.handleEvent(event);
			if (listeners[type]) {
				listeners[type] = listeners[type].filter((l) => l !== listener);
			}
		},
		dispatchEvent(event: Event) {
			for (const fn of listeners[event.type] ?? []) fn(event as MockEvent);
			return true;
		},
		style: {} as CSSStyleDeclaration,
		setPointerCapture: vi.fn(),
		releasePointerCapture: vi.fn(),
		_fire(type: string, event: Record<string, unknown>) {
			const synthetic = { ...event, type } as MockEvent;
			for (const fn of listeners[type] ?? []) fn(synthetic);
		},
		_listenerCount(type: string) {
			return (listeners[type] ?? []).length;
		},
	};
}

/** Returns a PerspectiveCamera placed at (0, 0, 5). */
function makeCamera() {
	const cam = new PerspectiveCamera();
	cam.position.set(0, 0, 5);
	cam.updateMatrixWorld(true);
	return cam;
}

describe("OrbitControls", () => {
	it("stores camera and domElement on construction", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);

		expect(controls.camera).toBe(cam);
		expect(controls.domElement).toBe(el);
	});

	it("update() positions camera on the spherical surface around the target", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);

		// No pending deltas - update() should still place camera correctly.
		controls.update();

		const offset = new Vector3().copy(cam.position).sub(controls.target);
		const radius = offset.length;

		expect(radius).toBeCloseTo(5, 4);
		// Camera should still be on the Z axis.
		expect(cam.position.x).toBeCloseTo(0, 4);
		expect(cam.position.y).toBeCloseTo(0, 4);
		expect(cam.position.z).toBeCloseTo(5, 4);
	});

	it("wheel event zooms (changes orbital radius)", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);

		const before = cam.position.distanceTo(controls.target);

		// Scroll down → dolly out (radius increases).
		el._fire("wheel", { deltaY: 120, preventDefault: vi.fn() });

		const after = cam.position.distanceTo(controls.target);
		expect(after).toBeGreaterThan(before);
	});

	it("wheel event scrolling up zooms in (radius decreases)", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);

		const before = cam.position.distanceTo(controls.target);

		el._fire("wheel", { deltaY: -120, preventDefault: vi.fn() });

		const after = cam.position.distanceTo(controls.target);
		expect(after).toBeLessThan(before);
	});

	it("clamps phi to maxPolarAngle", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);
		controls.maxPolarAngle = Math.PI / 4;

		// Simulate a large downward rotate that would push phi past the limit.
		el._fire("pointerdown", {
			pointerId: 1,
			button: 0,
			clientX: 0,
			clientY: 0,
		});
		el._fire("pointermove", {
			pointerId: 1,
			clientX: 0,
			clientY: 9999,
		});
		el._fire("pointerup", { pointerId: 1 });
		controls.update();

		// After clamping phi must not exceed maxPolarAngle.
		const offset = new Vector3().copy(cam.position).sub(controls.target);
		// phi = acos(y / r); y should be >= cos(maxPolarAngle) * r
		const r = offset.length;
		const phi = Math.acos(Math.min(1, Math.max(-1, offset.y / r)));
		expect(phi).toBeLessThanOrEqual(controls.maxPolarAngle + 1e-9);
	});

	it("clamps phi to minPolarAngle", () => {
		const cam = makeCamera();
		cam.position.set(0, 0, 5);
		cam.updateMatrixWorld(true);
		const el = mockElement();
		const controls = new OrbitControls(cam, el);
		controls.minPolarAngle = (3 * Math.PI) / 4;

		// Simulate a large upward rotate that would push phi below the limit.
		el._fire("pointerdown", {
			pointerId: 1,
			button: 0,
			clientX: 0,
			clientY: 0,
		});
		el._fire("pointermove", {
			pointerId: 1,
			clientX: 0,
			clientY: -9999,
		});
		el._fire("pointerup", { pointerId: 1 });
		controls.update();

		const offset = new Vector3().copy(cam.position).sub(controls.target);
		const r = offset.length;
		const phi = Math.acos(Math.min(1, Math.max(-1, offset.y / r)));
		expect(phi).toBeGreaterThanOrEqual(controls.minPolarAngle - 1e-9);
	});

	it("dispose() removes all DOM event listeners", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);

		const before =
			el._listenerCount("pointerdown") +
			el._listenerCount("pointermove") +
			el._listenerCount("pointerup") +
			el._listenerCount("wheel") +
			el._listenerCount("contextmenu");

		expect(before).toBe(5);

		controls.dispose();

		const after =
			el._listenerCount("pointerdown") +
			el._listenerCount("pointermove") +
			el._listenerCount("pointerup") +
			el._listenerCount("wheel") +
			el._listenerCount("contextmenu");

		expect(after).toBe(0);
	});

	it("reset() restores the initial camera position", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);

		const originalZ = cam.position.z;

		// Zoom out.
		el._fire("wheel", { deltaY: 120, preventDefault: vi.fn() });
		expect(cam.position.z).not.toBeCloseTo(originalZ, 2);

		controls.reset();

		expect(cam.position.x).toBeCloseTo(0, 4);
		expect(cam.position.y).toBeCloseTo(0, 4);
		expect(cam.position.z).toBeCloseTo(originalZ, 4);
	});

	it("enabled = false prevents update() from moving the camera", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);
		controls.enabled = false;

		const before = cam.position.clone();

		// Simulate pointer drag.
		el._fire("pointerdown", {
			pointerId: 1,
			button: 0,
			clientX: 0,
			clientY: 0,
		});
		el._fire("pointermove", {
			pointerId: 1,
			clientX: 100,
			clientY: 100,
		});
		el._fire("pointerup", { pointerId: 1 });

		const moved = controls.update();

		expect(moved).toBe(false);
		expect(cam.position.x).toBeCloseTo(before.x, 4);
		expect(cam.position.y).toBeCloseTo(before.y, 4);
		expect(cam.position.z).toBeCloseTo(before.z, 4);
	});

	it("dispatches 'start' on pointerdown and 'end' on pointerup", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);

		const onStart = vi.fn();
		const onEnd = vi.fn();
		controls.addEventListener("start", onStart);
		controls.addEventListener("end", onEnd);

		el._fire("pointerdown", {
			pointerId: 1,
			button: 0,
			clientX: 0,
			clientY: 0,
		});
		expect(onStart).toHaveBeenCalledOnce();
		expect(onEnd).not.toHaveBeenCalled();

		el._fire("pointerup", { pointerId: 1 });
		expect(onEnd).toHaveBeenCalledOnce();
	});

	it("dispatches 'change' after update() when deltas are pending", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);

		const onChange = vi.fn();
		controls.addEventListener("change", onChange);

		// Inject a delta directly via a rotate drag.
		el._fire("pointerdown", {
			pointerId: 1,
			button: 0,
			clientX: 0,
			clientY: 0,
		});
		el._fire("pointermove", {
			pointerId: 1,
			clientX: 50,
			clientY: 0,
		});
		el._fire("pointerup", { pointerId: 1 });

		controls.update();
		expect(onChange).toHaveBeenCalled();
	});

	it("minDistance clamps the orbital radius", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);
		controls.minDistance = 10;

		// Zoom in hard - radius must not drop below minDistance.
		for (let i = 0; i < 20; i++) {
			el._fire("wheel", { deltaY: -120, preventDefault: vi.fn() });
		}

		const r = cam.position.distanceTo(controls.target);
		expect(r).toBeGreaterThanOrEqual(10 - 1e-9);
	});

	it("maxDistance clamps the orbital radius", () => {
		const cam = makeCamera();
		const el = mockElement();
		const controls = new OrbitControls(cam, el);
		controls.maxDistance = 6;

		// Zoom out hard.
		for (let i = 0; i < 20; i++) {
			el._fire("wheel", { deltaY: 120, preventDefault: vi.fn() });
		}

		const r = cam.position.distanceTo(controls.target);
		expect(r).toBeLessThanOrEqual(6 + 1e-9);
	});
});

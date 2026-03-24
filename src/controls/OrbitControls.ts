import { EventDispatcher } from "../core/EventDispatcher.ts";
import { MathUtils } from "../math/MathUtils.ts";
import { Spherical } from "../math/Spherical.ts";
import { Vector3 } from "../math/Vector3.ts";

interface OrbitCamera {
	position: Vector3;
	matrixWorld: { elements: number[] };
	lookAt: (target: Vector3) => void;
	updateMatrixWorld: (force?: boolean) => void;
}

interface OrbitDomElement extends EventTarget {
	style: CSSStyleDeclaration;
	clientWidth?: number;
	clientHeight?: number;
	setPointerCapture: (id: number) => void;
	releasePointerCapture: (id: number) => void;
}

const STATE = {
	NONE: 0,
	ROTATE: 1,
	PAN: 2,
} as const;

const _changeEvent = { type: "change" };
const _startEvent = { type: "start" };
const _endEvent = { type: "end" };

/**
 * Orbit camera controls. Rotates around a target point via pointer drag,
 * zooms with the scroll wheel, and pans with right-click drag.
 *
 * Dispatches "change", "start", and "end" events.
 */
export class OrbitControls extends EventDispatcher {
	camera: OrbitCamera;

	domElement: OrbitDomElement;

	/** World-space point the camera orbits around. */
	target = new Vector3();

	/** When false, all interaction is ignored. */
	enabled = true;

	enableRotate = true;

	enableZoom = true;

	enablePan = true;

	rotateSpeed = 1.0;

	zoomSpeed = 1.0;

	panSpeed = 1.0;

	/** Minimum orbital radius. */
	minDistance = 0;

	/** Maximum orbital radius. */
	maxDistance = Number.POSITIVE_INFINITY;

	/** Minimum polar angle (radians, 0 = top). */
	minPolarAngle = 0;

	/** Maximum polar angle (radians, Math.PI = bottom). */
	maxPolarAngle = Math.PI;

	/** When true, movements decelerate smoothly instead of stopping instantly. */
	enableDamping = false;

	/** Fraction of velocity lost per frame when damping is enabled. */
	dampingFactor = 0.05;

	autoRotate = false;

	/** Degrees per second. */
	autoRotateSpeed = 2.0;

	/** When true, panning moves in screen space. When false, panning moves along the horizontal plane. */
	screenSpacePanning = true;

	#spherical = new Spherical();

	/** Pending delta applied each update(). */
	#sphericalDelta = new Spherical(0, 0, 0);

	/** Pending pan offset accumulated across pointer moves. */
	#panOffset = new Vector3();

	/** Saved initial camera state for reset(). */
	#initialState: { position: Vector3; target: Vector3 };

	#state: (typeof STATE)[keyof typeof STATE] = STATE.NONE;

	/** Screen-space pointer position at last pointerdown/pointermove. */
	#pointerStart = { x: 0, y: 0 };

	#activePointerId = -1;

	#needsInit = true;

	#prevTime = 0;

	#onPointerDown: (event: Event) => void;
	#onPointerMove: (event: Event) => void;
	#onPointerUp: (event: Event) => void;
	#onWheel: (event: Event) => void;
	#onContextMenu: (event: Event) => void;

	constructor(camera: OrbitCamera, domElement: OrbitDomElement) {
		super();
		this.camera = camera;
		this.domElement = domElement;

		this.#initialState = {
			position: camera.position.clone(),
			target: this.target.clone(),
		};

		const offset = new Vector3().copy(camera.position).sub(this.target);
		this.#spherical.setFromVector3(offset);
		this.#needsInit = false;

		this.#onPointerDown = this.#handlePointerDown.bind(this);
		this.#onPointerMove = this.#handlePointerMove.bind(this);
		this.#onPointerUp = this.#handlePointerUp.bind(this);
		this.#onWheel = this.#handleWheel.bind(this);
		this.#onContextMenu = this.#handleContextMenu.bind(this);

		domElement.addEventListener("pointerdown", this.#onPointerDown);
		domElement.addEventListener("pointermove", this.#onPointerMove);
		domElement.addEventListener("pointerup", this.#onPointerUp);
		domElement.addEventListener("wheel", this.#onWheel);
		domElement.addEventListener("contextmenu", this.#onContextMenu);
	}

	/**
	 * Apply pending rotation, zoom, and pan then update the camera.
	 * Must be called each frame.
	 */
	update(): boolean {
		if (!this.enabled) return false;

		const now = performance.now();
		const dt = this.#prevTime ? (now - this.#prevTime) / 1000 : 0;
		this.#prevTime = now;

		if (this.autoRotate) {
			this.#sphericalDelta.theta -=
				MathUtils.toRadians(this.autoRotateSpeed) * dt;
		}

		if (this.#needsInit) {
			const offset = new Vector3().copy(this.camera.position).sub(this.target);
			this.#spherical.setFromVector3(offset);
			this.#needsInit = false;
		}

		this.#spherical.theta += this.#sphericalDelta.theta;
		this.#spherical.phi += this.#sphericalDelta.phi;

		this.#spherical.phi = Math.max(
			this.minPolarAngle,
			Math.min(this.maxPolarAngle, this.#spherical.phi),
		);

		this.#spherical.makeSafe();

		this.#spherical.radius = Math.max(
			this.minDistance,
			Math.min(this.maxDistance, this.#spherical.radius),
		);

		this.target.add(this.#panOffset);

		const offset = new Vector3().setFromSpherical(this.#spherical);
		this.camera.position.copy(this.target).add(offset);
		this.camera.lookAt(this.target);

		const moved =
			this.#sphericalDelta.theta !== 0 ||
			this.#sphericalDelta.phi !== 0 ||
			this.#sphericalDelta.radius !== 0 ||
			this.#panOffset.x !== 0 ||
			this.#panOffset.y !== 0 ||
			this.#panOffset.z !== 0;

		if (this.enableDamping) {
			this.#sphericalDelta.theta *= 1 - this.dampingFactor;
			this.#sphericalDelta.phi *= 1 - this.dampingFactor;
			this.#panOffset.mulScalar(1 - this.dampingFactor);
		} else {
			this.#sphericalDelta.set(0, 0, 0);
			this.#panOffset.set(0, 0, 0);
		}

		if (moved) {
			this.dispatchEvent(_changeEvent);
		}

		return moved;
	}

	/** Remove all DOM event listeners. Call when the controls are no longer needed. */
	dispose(): void {
		this.domElement.removeEventListener("pointerdown", this.#onPointerDown);
		this.domElement.removeEventListener("pointermove", this.#onPointerMove);
		this.domElement.removeEventListener("pointerup", this.#onPointerUp);
		this.domElement.removeEventListener("wheel", this.#onWheel);
		this.domElement.removeEventListener("contextmenu", this.#onContextMenu);
	}

	/** Restore the camera position and target to the values at construction time. */
	reset(): void {
		this.camera.position.copy(this.#initialState.position);
		this.target.copy(this.#initialState.target);
		this.#sphericalDelta.set(0, 0, 0);
		this.#panOffset.set(0, 0, 0);
		this.#needsInit = true;
		this.#prevTime = 0;
		this.update();
	}

	#handlePointerDown(rawEvent: Event): void {
		if (!this.enabled) return;
		const event = rawEvent as PointerEvent;

		this.#activePointerId = event.pointerId;
		this.domElement.setPointerCapture(event.pointerId);

		this.#pointerStart.x = event.clientX;
		this.#pointerStart.y = event.clientY;

		if (event.button === 0 && this.enableRotate) {
			this.#state = STATE.ROTATE;
		} else if ((event.button === 1 || event.button === 2) && this.enablePan) {
			this.#state = STATE.PAN;
		}

		if (this.#state !== STATE.NONE) {
			this.dispatchEvent(_startEvent);
		}
	}

	#handlePointerMove(rawEvent: Event): void {
		const event = rawEvent as PointerEvent;
		if (!this.enabled || event.pointerId !== this.#activePointerId) return;
		if (this.#state === STATE.NONE) return;

		const dx = event.clientX - this.#pointerStart.x;
		const dy = event.clientY - this.#pointerStart.y;

		if (this.#state === STATE.ROTATE) {
			// PI covers a half orbit per full drag; scale by element size for sensitivity.
			const el = this.domElement as OrbitDomElement;
			const width = el.clientWidth ?? 800;
			const height = el.clientHeight ?? 600;

			this.#sphericalDelta.theta -= ((Math.PI * dx) / width) * this.rotateSpeed;
			this.#sphericalDelta.phi -= ((Math.PI * dy) / height) * this.rotateSpeed;
		} else if (this.#state === STATE.PAN) {
			this.#pan(dx, dy);
		}

		this.#pointerStart.x = event.clientX;
		this.#pointerStart.y = event.clientY;
	}

	#handlePointerUp(rawEvent: Event): void {
		const event = rawEvent as PointerEvent;
		if (event.pointerId !== this.#activePointerId) return;

		this.domElement.releasePointerCapture(event.pointerId);
		this.#activePointerId = -1;

		if (this.#state !== STATE.NONE) {
			this.dispatchEvent(_endEvent);
		}

		this.#state = STATE.NONE;
	}

	#handleWheel(rawEvent: Event): void {
		if (!(this.enabled && this.enableZoom)) return;
		const event = rawEvent as WheelEvent;

		event.preventDefault?.();

		const delta =
			event.deltaY > 0
				? 1 / (1 - 0.1 * this.zoomSpeed)
				: 1 - 0.1 * this.zoomSpeed;
		this.#spherical.radius = Math.max(
			this.minDistance,
			Math.min(this.maxDistance, this.#spherical.radius * delta),
		);

		const offset = new Vector3().setFromSpherical(this.#spherical);
		this.camera.position.copy(this.target).add(offset);
		this.camera.lookAt(this.target);
		this.dispatchEvent(_changeEvent);
	}

	#handleContextMenu(event: Event): void {
		event.preventDefault?.();
	}

	/**
	 * Accumulate a pan delta into #panOffset.
	 * In screen-space mode uses camera right/up from matrixWorld columns 0 and 1.
	 * In horizontal-plane mode uses camera right and world-Y for the up component.
	 */
	#pan(dx: number, dy: number): void {
		const distance = this.camera.position.distanceTo(this.target);
		const me = this.camera.matrixWorld.elements;

		// Column 0: camera right vector (world space)
		const rx = me[0];
		const ry = me[1];
		const rz = me[2];

		let ux: number;
		let uy: number;
		let uz: number;
		if (this.screenSpacePanning) {
			// Column 1: camera up vector (world space)
			ux = me[4];
			uy = me[5];
			uz = me[6];
		} else {
			// World-Y as the up component so panning stays on the horizontal plane
			ux = 0;
			uy = 1;
			uz = 0;
		}

		const scale = distance * this.panSpeed * 0.001;

		this.#panOffset.x -= (rx * dx - ux * dy) * scale;
		this.#panOffset.y -= (ry * dx - uy * dy) * scale;
		this.#panOffset.z -= (rz * dx - uz * dy) * scale;
	}
}

import { EventDispatcher } from "../core/EventDispatcher.ts";
import { toRadians } from "../math/MathUtils.ts";
import { Spherical } from "../math/Spherical.ts";
import { Vector3 } from "../math/Vector3.ts";

interface OrbitCamera {
  position: Vector3;
  matrixWorld: { elements: ArrayLike<number> };
  type?: string;
  zoom?: number;
  top?: number;
  bottom?: number;
  lookAt: (target: Vector3) => void;
  updateMatrixWorld: (force?: boolean) => void;
  updateProjectionMatrix?: () => void;
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
  /** Camera moved by orbit, zoom, and pan input. */
  camera: OrbitCamera;

  /** Event target that receives pointer, wheel, and context-menu listeners. */
  domElement: OrbitDomElement;

  /** World-space point the camera orbits around. */
  target: Vector3 = new Vector3();

  /** When false, all interaction is ignored. */
  enabled: boolean = true;

  /** Whether primary-button dragging changes orbital angles. */
  enableRotate: boolean = true;

  /** Whether wheel input changes orbital radius. */
  enableZoom: boolean = true;

  /** Whether panning input changes the target position. */
  enablePan: boolean = true;

  /** Action assigned to primary-button dragging. Map controls use panning. */
  primaryAction: "pan" | "rotate" = "rotate";

  /** Minimum orthographic zoom multiplier. */
  minZoom: number = 0.01;

  /** Maximum orthographic zoom multiplier. */
  maxZoom: number = Number.POSITIVE_INFINITY;

  /** Multiplier applied to pointer-derived angular deltas. */
  rotateSpeed: number = 1.0;

  /** Multiplier applied to wheel-derived radius changes. */
  zoomSpeed: number = 1.0;

  /** Multiplier applied to pointer-derived pan distance. */
  panSpeed: number = 1.0;

  /** Lower bound for orbital radius in world units. */
  minDistance: number = 0;

  /** Upper bound for orbital radius in world units. */
  maxDistance: number = Number.POSITIVE_INFINITY;

  /** Minimum polar angle (radians, 0 = top). */
  minPolarAngle: number = 0;

  /** Maximum polar angle (radians, Math.PI = bottom). */
  maxPolarAngle: number = Math.PI;

  /** When true, movements decelerate smoothly instead of stopping instantly. */
  enableDamping: boolean = false;

  /** Fraction of velocity lost per frame when damping is enabled. */
  dampingFactor: number = 0.05;

  /** Whether each update adds the configured automatic angular step. */
  autoRotate: boolean = false;

  /** Automatic azimuth speed in degrees per second when enabled. */
  autoRotateSpeed: number = 2.0;

  /** When true, panning moves in screen space. When false, panning moves along the horizontal plane. */
  screenSpacePanning: boolean = true;

  #spherical: Spherical = new Spherical();

  /** Pending spherical rotation and radius deltas consumed by `update()`. */
  #sphericalDelta: Spherical = new Spherical(0, 0, 0);

  /** Pending world-space target offset accumulated across pointer moves. */
  #panOffset: Vector3 = new Vector3();

  /** Camera position and target captured by the constructor for `reset()`. */
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

  /** Creates controls and installs listeners on the supplied event target. */
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
   * Applies pending rotation, zoom, and pan, then updates the camera. Call once
   * per frame; returns whether the camera moved.
   */
  update(): boolean {
    if (!this.enabled) return false;

    const now = performance.now();
    const dt = this.#prevTime ? (now - this.#prevTime) / 1000 : 0;
    this.#prevTime = now;

    const autoRotateDelta = this.autoRotate
      ? -toRadians(this.autoRotateSpeed) * dt
      : 0;

    if (this.#needsInit) {
      const offset = new Vector3().copy(this.camera.position).sub(this.target);
      this.#spherical.setFromVector3(offset);
      this.#needsInit = false;
    }

    const dampingScale = this.enableDamping
      ? Math.max(0, Math.min(1, this.dampingFactor))
      : 1;
    this.#spherical.theta +=
      this.#sphericalDelta.theta * dampingScale + autoRotateDelta;
    this.#spherical.phi += this.#sphericalDelta.phi * dampingScale;

    this.#spherical.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.#spherical.phi),
    );

    this.#spherical.makeSafe();

    this.#spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.#spherical.radius),
    );

    this.target.addScaledVector(this.#panOffset, dampingScale);

    const offset = new Vector3().setFromSpherical(this.#spherical);
    this.camera.position.copy(this.target).add(offset);
    // lookAt() reads the eye position from matrixWorld.
    this.camera.updateMatrixWorld(true);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld(true);

    const moved =
      autoRotateDelta !== 0 ||
      this.#sphericalDelta.theta !== 0 ||
      this.#sphericalDelta.phi !== 0 ||
      this.#sphericalDelta.radius !== 0 ||
      this.#panOffset.x !== 0 ||
      this.#panOffset.y !== 0 ||
      this.#panOffset.z !== 0;

    if (this.enableDamping) {
      this.#sphericalDelta.theta *= 1 - this.dampingFactor;
      this.#sphericalDelta.phi *= 1 - this.dampingFactor;
      this.#panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this.#sphericalDelta.set(0, 0, 0);
      this.#panOffset.set(0, 0, 0);
    }

    if (moved) {
      this.dispatchEvent(_changeEvent);
    }

    return moved;
  }

  /** Removes all installed DOM listeners; call when controls are no longer needed. */
  dispose(): void {
    this.domElement.removeEventListener("pointerdown", this.#onPointerDown);
    this.domElement.removeEventListener("pointermove", this.#onPointerMove);
    this.domElement.removeEventListener("pointerup", this.#onPointerUp);
    this.domElement.removeEventListener("wheel", this.#onWheel);
    this.domElement.removeEventListener("contextmenu", this.#onContextMenu);
  }

  /** Restores the camera position and target captured at construction time. */
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

    if (event.button === 0) {
      if (this.primaryAction === "pan" && this.enablePan) {
        this.#state = STATE.PAN;
      } else if (this.primaryAction === "rotate" && this.enableRotate) {
        this.#state = STATE.ROTATE;
      }
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
    if (
      this.camera.type === "OrthographicCamera" &&
      this.camera.zoom !== undefined
    ) {
      this.camera.zoom = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, this.camera.zoom / delta),
      );
      this.camera.updateProjectionMatrix?.();
    } else {
      this.#spherical.radius = Math.max(
        this.minDistance,
        Math.min(this.maxDistance, this.#spherical.radius * delta),
      );
      const offset = new Vector3().setFromSpherical(this.#spherical);
      this.camera.position.copy(this.target).add(offset);
      // lookAt() reads the eye position from matrixWorld.
      this.camera.updateMatrixWorld(true);
      this.camera.lookAt(this.target);
      this.camera.updateMatrixWorld(true);
    }
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
      // Project camera-up onto the horizontal plane.
      const horizontalLength = Math.hypot(rx, rz) || 1;
      ux = rz / horizontalLength;
      uy = 0;
      uz = -rx / horizontalLength;
    }

    const elementHeight = this.domElement.clientHeight ?? 600;
    const orthographicHeight =
      this.camera.type === "OrthographicCamera" &&
      this.camera.top !== undefined &&
      this.camera.bottom !== undefined
        ? Math.abs(this.camera.top - this.camera.bottom) /
          Math.max(this.camera.zoom ?? 1, Number.EPSILON)
        : undefined;
    const scale =
      orthographicHeight === undefined
        ? distance * this.panSpeed * 0.001
        : (orthographicHeight * this.panSpeed) / elementHeight;

    const direction = this.primaryAction === "pan" ? 1 : -1;
    this.#panOffset.x += (rx * dx - ux * dy) * scale * direction;
    this.#panOffset.y += (ry * dx - uy * dy) * scale * direction;
    this.#panOffset.z += (rz * dx - uz * dy) * scale * direction;
  }
}

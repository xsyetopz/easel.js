import { EventDispatcher } from "../core/EventDispatcher.ts";
import { Spherical } from "../math/Spherical.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
  type ControlDomElement,
  type ControlEvent,
  prevent,
} from "./ControlDom.ts";

type TrackballCamera = {
  position: Vector3;
  matrixWorld: { elements: ArrayLike<number> };
  lookAt: (target: Vector3) => void;
  updateMatrixWorld: (...args: boolean[]) => void;
};

const STATE = { NONE: 0, ROTATE: 1, ZOOM: 2, PAN: 3 } as const;

/** Pointer trackball camera controls with three.js-compatible update/dispose APIs. */
export class TrackballControls extends EventDispatcher {
  /** Camera moved by trackball input. */
  camera: TrackballCamera;
  /** Event target receiving pointer and wheel listeners. */
  domElement: ControlDomElement;
  /** World-space point the camera revolves around. */
  target = new Vector3();
  /** When false, all interaction is ignored. */
  enabled = true;
  /** Pointer rotation multiplier. */
  rotateSpeed = 1;
  /** Pointer and wheel zoom multiplier. */
  zoomSpeed = 1.2;
  /** Pointer pan multiplier. */
  panSpeed = 0.3;
  /** Disable primary-button rotation. */
  noRotate = false;
  /** Disable middle-button and wheel zoom. */
  noZoom = false;
  /** Disable secondary-button panning. */
  noPan = false;
  /** Apply input immediately instead of damping it over successive updates. */
  staticMoving = false;
  /** Fraction of pending input retained when staticMoving is disabled. */
  dynamicDampingFactor = 0.2;
  /** Legacy key mapping retained for three.js example compatibility. */
  keys: string[] = ["KeyA", "KeyS", "KeyD"];
  /** Minimum camera distance from target. */
  minDistance = 0;
  /** Maximum camera distance from target. */
  maxDistance = Number.POSITIVE_INFINITY;

  #initialPosition: Vector3;
  #initialTarget: Vector3;

  #state: (typeof STATE)[keyof typeof STATE] = STATE.NONE;
  #pointer = { x: 0, y: 0 };
  #pointerId = -1;
  #spherical = new Spherical();
  #delta = new Spherical(0, 0, 0);
  #pan = new Vector3();
  #listeners: Array<[string, EventListener]> = [];

  /** Creates controls and installs listeners on the supplied event target. */
  constructor(camera: TrackballCamera, domElement: ControlDomElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.#initialPosition = camera.position.clone();
    this.#initialTarget = this.target.clone();
    this.#spherical.setFromVector3(
      new Vector3().copy(camera.position).sub(this.target),
    );
    this.#listen("pointerdown", this.#onPointerDown.bind(this));
    this.#listen("pointermove", this.#onPointerMove.bind(this));
    this.#listen("pointerup", this.#onPointerUp.bind(this));
    this.#listen("wheel", this.#onWheel.bind(this));
    this.#listen("contextmenu", (event) => prevent(event));
    if (domElement.style) domElement.style.touchAction = "none";
  }

  /** Applies pending trackball input and returns whether the camera moved. */
  update(): boolean {
    if (!this.enabled) return false;
    this.#spherical.theta += this.#delta.theta;
    this.#spherical.phi = Math.max(
      1e-5,
      Math.min(Math.PI - 1e-5, this.#spherical.phi + this.#delta.phi),
    );
    this.#spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.#spherical.radius + this.#delta.radius),
    );
    this.target.add(this.#pan);
    this.camera.position
      .copy(this.target)
      .add(new Vector3().setFromSpherical(this.#spherical));
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld(false, true);
    const moved =
      this.#delta.theta !== 0 ||
      this.#delta.phi !== 0 ||
      this.#delta.radius !== 0 ||
      this.#pan.lengthSq !== 0;
    if (this.staticMoving) {
      this.#delta.set(0, 0, 0);
      this.#pan.set(0, 0, 0);
    } else {
      this.#delta.theta *= this.dynamicDampingFactor;
      this.#delta.phi *= this.dynamicDampingFactor;
      this.#delta.radius *= this.dynamicDampingFactor;
      this.#pan.multiplyScalar(this.dynamicDampingFactor);
    }
    if (moved) this.dispatchEvent({ type: "change" });
    return moved;
  }

  /** Removes all installed DOM listeners. */
  dispose(): void {
    for (const [type, listener] of this.#listeners)
      this.domElement.removeEventListener(type, listener);
    this.#listeners.length = 0;
  }

  /** Recomputes the interaction viewport dimensions after a canvas resize. */
  handleResize(): void {
    this.#spherical.setFromVector3(
      new Vector3().copy(this.camera.position).sub(this.target),
    );
  }

  /** Restores the camera position and target captured at construction time. */
  reset(): void {
    this.camera.position.copy(this.#initialPosition);
    this.target.copy(this.#initialTarget);
    this.handleResize();
    this.#delta.set(0, 0, 0);
    this.#pan.set(0, 0, 0);
    this.update();
  }

  #listen(type: string, listener: EventListener): void {
    this.domElement.addEventListener(type, listener);
    this.#listeners.push([type, listener]);
  }

  #onPointerDown(raw: Event): void {
    if (!this.enabled) return;
    const event = raw as ControlEvent;
    this.#pointerId = event.pointerId ?? 0;
    this.domElement.setPointerCapture?.(this.#pointerId);
    this.#pointer.x = event.clientX ?? 0;
    this.#pointer.y = event.clientY ?? 0;
    if (event.button === 0 && !this.noRotate) this.#state = STATE.ROTATE;
    else if (event.button === 1 && !this.noZoom) this.#state = STATE.ZOOM;
    else if (event.button === 2 && !this.noPan) this.#state = STATE.PAN;
    if (this.#state !== STATE.NONE) this.dispatchEvent({ type: "start" });
  }

  #onPointerMove(raw: Event): void {
    const event = raw as ControlEvent;
    if (
      !this.enabled ||
      this.#state === STATE.NONE ||
      event.pointerId !== this.#pointerId
    )
      return;
    const dx = (event.clientX ?? 0) - this.#pointer.x;
    const dy = (event.clientY ?? 0) - this.#pointer.y;
    this.#pointer.x = event.clientX ?? 0;
    this.#pointer.y = event.clientY ?? 0;
    const width = this.domElement.clientWidth ?? 800;
    const height = this.domElement.clientHeight ?? 600;
    if (this.#state === STATE.ROTATE) {
      this.#delta.theta -= ((Math.PI * dx) / width) * this.rotateSpeed;
      this.#delta.phi -= ((Math.PI * dy) / height) * this.rotateSpeed;
    } else if (this.#state === STATE.ZOOM) {
      this.#delta.radius += this.#spherical.radius * dy * 0.01 * this.zoomSpeed;
    } else {
      const m = this.camera.matrixWorld.elements;
      const scale = this.#spherical.radius * this.panSpeed * 0.001;
      this.#pan.x -= m[0] * dx * scale - m[4] * dy * scale;
      this.#pan.y -= m[1] * dx * scale - m[5] * dy * scale;
      this.#pan.z -= m[2] * dx * scale - m[6] * dy * scale;
    }
  }

  #onPointerUp(raw: Event): void {
    const event = raw as ControlEvent;
    if (event.pointerId !== this.#pointerId) return;
    this.domElement.releasePointerCapture?.(this.#pointerId);
    this.#pointerId = -1;
    if (this.#state !== STATE.NONE) this.dispatchEvent({ type: "end" });
    this.#state = STATE.NONE;
  }

  #onWheel(raw: Event): void {
    if (!this.enabled || this.noZoom) return;
    const event = raw as ControlEvent;
    prevent(event);
    this.#delta.radius +=
      this.#spherical.radius *
      Math.sign(event.deltaY ?? 0) *
      0.1 *
      this.zoomSpeed;
  }
}

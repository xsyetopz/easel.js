import { EventDispatcher } from "../core/EventDispatcher.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
  type ControlDomElement,
  type ControlEvent,
  now,
  prevent,
} from "./ControlDom.ts";

type FirstPersonCamera = {
  position: Vector3;
  rotation: {
    x: number;
    y: number;
    z: number;
    reorder: (order: "YXZ") => void;
  };
  quaternion: { x: number; y: number; z: number; w: number };
  updateMatrixWorld: (...args: boolean[]) => void;
};

const _forward = new Vector3();
const _right = new Vector3();
const _up = new Vector3(0, 1, 0);

/**
 * Keyboard and pointer-look camera controls for CPU-rendered scenes.
 * The public update(delta), dispose(), and movement properties mirror the
 * three.js FirstPersonControls addon without requiring a GPU renderer.
 */
export class FirstPersonControls extends EventDispatcher {
  /** Camera moved by keyboard and pointer input. */
  camera: FirstPersonCamera;
  /** Event target receiving pointer, keyboard, and context-menu listeners. */
  domElement: ControlDomElement;
  /** When false, input and movement are ignored. */
  enabled: boolean = true;
  /** Whether pointer motion controls the view. */
  activeLook: boolean = true;
  /** Move forward while no backward key is pressed. */
  autoForward: boolean = false;
  /** Clamp vertical look between verticalMin and verticalMax. */
  constrainVertical: boolean = false;
  /** Scale movement speed by camera height. */
  heightSpeed: boolean = false;
  /** Enable vertical pointer look. */
  lookVertical: boolean = true;
  /** World units moved per second. */
  movementSpeed = 1;
  /** Radians turned per pointer pixel. */
  lookSpeed = 0.005;
  /** Height scale used by heightSpeed. */
  heightCoef = 1;
  /** Minimum constrained vertical angle in radians. */
  verticalMin = 0;
  /** Maximum constrained vertical angle in radians. */
  verticalMax = Math.PI;

  readonly #move: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
  } = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };
  readonly #look: { x: number; y: number; lastX?: number; lastY?: number } = {
    x: 0,
    y: 0,
  };
  readonly #listeners: Array<[string, EventListener]> = [];
  readonly #globalListeners: Array<[string, EventListener]> = [];
  #lastTime = 0;

  /** Creates controls and installs listeners on the supplied event target. */
  constructor(camera: FirstPersonCamera, domElement: ControlDomElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.camera.rotation.reorder("YXZ");
    this.#listen("pointermove", this.#onPointerMove.bind(this));
    this.#listen("keydown", this.#onKeyDown.bind(this));
    this.#listen("keyup", this.#onKeyUp.bind(this));
    this.#listen("contextmenu", (event) => prevent(event));
    const globalTarget = globalThis as unknown as {
      addEventListener?: (type: string, listener: EventListener) => void;
    };
    if (globalTarget.addEventListener) {
      this.#listenGlobal("keydown", this.#onKeyDown.bind(this));
      this.#listenGlobal("keyup", this.#onKeyUp.bind(this));
    }
  }

  /** Applies movement and look input for the elapsed seconds; returns whether the camera moved. */
  update(delta?: number): boolean {
    if (!this.enabled) return false;
    const seconds =
      delta ?? (this.#lastTime !== 0 ? (now() - this.#lastTime) / 1000 : 0);
    this.#lastTime = now();
    const dt = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const lookX = this.#look.x;
    const lookY = this.#look.y;
    this.#look.x = 0;
    this.#look.y = 0;

    const distance = this.#computeDistance(dt);
    this.#applyMovement(distance);
    this.#applyLook(lookX, lookY);
    this.camera.updateMatrixWorld(false, true);
    const changed = distance !== 0 || lookX !== 0 || lookY !== 0;
    if (changed) this.dispatchEvent({ type: "change" });
    return changed;
  }

  #computeDistance(dt: number): number {
    let speed = this.movementSpeed;
    if (this.heightSpeed) {
      speed *= this.heightCoef;
      speed *= Math.max(
        0,
        Math.min(1, this.camera.position.y / Math.max(1, this.heightCoef)),
      );
    }
    return speed * dt;
  }

  #applyMovement(distance: number): void {
    _forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    _right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    if (this.#move.forward || (this.autoForward && !this.#move.backward))
      this.camera.position.addScaledVector(_forward, distance);
    if (this.#move.backward)
      this.camera.position.addScaledVector(_forward, -distance);
    if (this.#move.right)
      this.camera.position.addScaledVector(_right, distance);
    if (this.#move.left)
      this.camera.position.addScaledVector(_right, -distance);
    if (this.#move.up) this.camera.position.addScaledVector(_up, distance);
    if (this.#move.down) this.camera.position.addScaledVector(_up, -distance);
  }

  #applyLook(lookX: number, lookY: number): void {
    if (!this.activeLook) return;
    this.camera.rotation.y -= lookX * this.lookSpeed;
    if (this.lookVertical) this.camera.rotation.x -= lookY * this.lookSpeed;
    if (this.constrainVertical) {
      this.camera.rotation.x = Math.max(
        this.verticalMin,
        Math.min(this.verticalMax, this.camera.rotation.x),
      );
    }
  }

  /** Removes all installed DOM listeners. */
  dispose(): void {
    for (const [type, listener] of this.#listeners)
      this.domElement.removeEventListener(type, listener);
    this.#listeners.length = 0;
    const globalTarget = globalThis as unknown as {
      removeEventListener?: (type: string, listener: EventListener) => void;
    };
    if (globalTarget.removeEventListener)
      for (const [type, listener] of this.#globalListeners)
        globalTarget.removeEventListener(type, listener);
    this.#globalListeners.length = 0;
  }

  /** Recomputes browser interaction state after a canvas resize. */
  handleResize(): void {
    this.#look.x = 0;
    this.#look.y = 0;
    delete this.#look.lastX;
    delete this.#look.lastY;
  }

  #listen(type: string, listener: EventListener): void {
    this.domElement.addEventListener(type, listener);
    this.#listeners.push([type, listener]);
  }

  #listenGlobal(type: string, listener: EventListener): void {
    (
      globalThis as unknown as {
        addEventListener: (type: string, listener: EventListener) => void;
      }
    ).addEventListener(type, listener);
    this.#globalListeners.push([type, listener]);
  }

  #onPointerMove(raw: Event): void {
    if (!(this.enabled && this.activeLook)) return;
    const event = raw as ControlEvent;
    this.#look.x += event.movementX ?? 0;
    this.#look.y += event.movementY ?? 0;
    if (event.movementX === undefined)
      this.#look.x +=
        (event.clientX ?? 0) - (this.#look.lastX ?? event.clientX ?? 0);
    if (event.movementY === undefined)
      this.#look.y +=
        (event.clientY ?? 0) - (this.#look.lastY ?? event.clientY ?? 0);
    if (event.clientX !== undefined) this.#look.lastX = event.clientX;
    if (event.clientY !== undefined) this.#look.lastY = event.clientY;
  }

  #onKeyDown(raw: Event): void {
    const event = raw as ControlEvent;
    const key = (event.code ?? event.key ?? "").toLowerCase();
    if (key === "keyw" || key === "arrowup") this.#move.forward = true;
    else if (key === "keys" || key === "arrowdown") this.#move.backward = true;
    else if (key === "keya" || key === "arrowleft") this.#move.left = true;
    else if (key === "keyd" || key === "arrowright") this.#move.right = true;
    else if (key === "space") this.#move.up = true;
    else if (key === "shiftleft" || key === "shiftright")
      this.#move.down = true;
  }

  #onKeyUp(raw: Event): void {
    const event = raw as ControlEvent;
    const key = (event.code ?? event.key ?? "").toLowerCase();
    if (key === "keyw" || key === "arrowup") this.#move.forward = false;
    else if (key === "keys" || key === "arrowdown") this.#move.backward = false;
    else if (key === "keya" || key === "arrowleft") this.#move.left = false;
    else if (key === "keyd" || key === "arrowright") this.#move.right = false;
    else if (key === "space") this.#move.up = false;
    else if (key === "shiftleft" || key === "shiftright")
      this.#move.down = false;
  }
}

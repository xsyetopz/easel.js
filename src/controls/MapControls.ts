import { MOUSE, TOUCH } from "../core/Constants.ts";
import { Raycaster } from "../core/Raycaster.ts";
import { Plane } from "../math/Plane.ts";
import { Vector2 } from "../math/Vector2.ts";
import { Vector3 } from "../math/Vector3.ts";
import type { ControlDomElement } from "./ControlDom.ts";
import { type OrbitCamera, OrbitControls } from "./OrbitControls.ts";

const _plane = new Plane();
const _raycaster = new Raycaster();
const _mouse = new Vector2();
const _panCurrent = new Vector3();

/**
 * Map controls for a bird's-eye camera over a ground plane.
 *
 * Mirrors three.js r186 `MapControls`: an {@link OrbitControls} with panning
 * in the plane orthogonal to the camera's `up` vector and remapped inputs.
 * - Pan: left mouse, or arrow keys after `listenToKeyEvents`; one-finger touch.
 *   The world point under the pointer stays under the pointer while dragging.
 * - Zoom: middle mouse or mouse wheel; two-finger spread or squish.
 * - Orbit: right mouse, or left mouse + ctrl/meta/shift; two-finger rotate.
 */
export class MapControls extends OrbitControls {
  /** Mouse-button actions: left pans, middle dollies, right rotates. */
  override mouseButtons: OrbitControls["mouseButtons"] = {
    LEFT: MOUSE.PAN,
    MIDDLE: MOUSE.DOLLY,
    RIGHT: MOUSE.ROTATE,
  };

  /** Touch actions: one finger pans, two fingers dolly and rotate. */
  override touches: OrbitControls["touches"] = {
    ONE: TOUCH.PAN,
    TWO: TOUCH.DOLLY_ROTATE,
  };

  readonly #panWorldStart = new Vector3();

  /**
   * Creates map controls for `object`, connecting to `domElement` when given.
   *
   * @param object The camera to control.
   * @param domElement The element used for pointer and wheel listeners.
   */
  constructor(object: OrbitCamera, domElement?: ControlDomElement) {
    super(object, domElement);
    this.screenSpacePanning = false;
  }

  /**
   * Starts a pan and, for ground-plane panning, records the world point under
   * the pointer.
   *
   * @param event The pointer event that started the pan.
   */
  protected override handleMouseDownPan(event: PointerEvent): void {
    super.handleMouseDownPan(event);

    this.panOffset.set(0, 0, 0);

    if (this.screenSpacePanning === true) return;

    _plane.setFromNormalAndCoplanarPoint(this.object.up, this.target);

    if (!this.#pointerToNdc(event)) return;

    _raycaster.setFromCamera(_mouse, this.object);
    _raycaster.ray.intersectPlane(_plane, this.#panWorldStart);
  }

  /**
   * Moves the target so the world point grabbed at pan start stays under the
   * pointer; screen-space panning uses the orbit behavior.
   *
   * @param event The pointer event that moved the pan.
   */
  protected override handleMouseMovePan(event: PointerEvent): void {
    if (this.screenSpacePanning === true) {
      super.handleMouseMovePan(event);
      return;
    }

    if (!this.#pointerToNdc(event)) return;

    _raycaster.setFromCamera(_mouse, this.object);

    if (_raycaster.ray.intersectPlane(_plane, _panCurrent)) {
      _panCurrent.sub(this.#panWorldStart);
      this.panOffset.copy(_panCurrent).negate();

      this.update();
    }
  }

  #pointerToNdc(event: PointerEvent): boolean {
    const rect = this.domElement?.getBoundingClientRect?.();
    if (rect === undefined) return false;
    _mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    _mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return true;
  }
}

import type { Camera } from "../cameras/Camera.ts";
import { MOUSE, TOUCH } from "../core/Constants.ts";
import type { Node } from "../core/Node.ts";
import type { Intersection } from "../core/Raycaster.ts";
import { Raycaster } from "../core/Raycaster.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Plane } from "../math/Plane.ts";
import { Vector2 } from "../math/Vector2.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
  type ControlMouseButtons,
  Controls,
  type ControlTouches,
} from "./Controls.ts";

/** Event dispatched by {@link DragControls}. */
export interface DragControlsEvent {
  /** Event name: `hoveron`, `hoveroff`, `dragstart`, `drag`, or `dragend`. */
  type: string;
  /** Object hovered or dragged. */
  object: Node;
}

/** Element that receives {@link DragControls} pointer listeners. */
interface DragDomElement extends EventTarget {
  /** Inline style used for `touchAction` and the hover/drag cursor. */
  style?: { touchAction: string; cursor: string };
  /** Returns the element's client-space bounds for pointer normalization. */
  getBoundingClientRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

/** Pointer fields read by {@link DragControls}. */
type DragPointerEvent = Event & {
  pointerType?: string;
  button?: number;
  clientX: number;
  clientY: number;
};

const STATE = {
  NONE: -1,
  PAN: 0,
  ROTATE: 1,
} as const;

const _plane = new Plane();
const _pointer = new Vector2();
const _offset = new Vector3();
const _diff = new Vector2();
const _previousPointer = new Vector2();
const _intersection = new Vector3();
const _worldPosition = new Vector3();
const _inverseMatrix = new Matrix4();
const _up = new Vector3();
const _right = new Vector3();
const _intersections: Intersection[] = [];

/**
 * Drag-and-drop controls for scene objects.
 *
 * Picking uses a CPU {@link Raycaster}. With the default mouse mapping the
 * left and middle buttons pan the picked object across a camera-facing plane
 * and the right button rotates it around the camera's up and right axes; one
 * touch pans. Hover tracking runs for mouse and pen pointers only.
 *
 * Dispatches `hoveron`, `hoveroff`, `dragstart`, `drag`, and `dragend` with
 * the affected object in `event.object`.
 */
export class DragControls extends Controls {
  /** Camera used to build picking rays. */
  declare object: Camera;

  /** Element that receives pointer listeners. */
  declare domElement: DragDomElement | undefined;

  /** Draggable objects. The array is used by reference, so it can be edited later. */
  objects: Node[];

  /** Whether picking also tests the descendants of `objects`. */
  recursive: boolean = true;

  /** Whether dragging moves the outermost `Group` above the picked object instead. */
  transformGroup: boolean = false;

  /** Rotation speed multiplier for the rotate mode. */
  rotateSpeed: number = 1;

  /** Raycaster used for picking. */
  raycaster: Raycaster = new Raycaster();

  /** Action for each mouse button: `MOUSE.PAN`, `MOUSE.ROTATE`, or `undefined`. */
  override mouseButtons: ControlMouseButtons = {
    LEFT: MOUSE.PAN,
    MIDDLE: MOUSE.PAN,
    RIGHT: MOUSE.ROTATE,
  };

  /** Action for a one-finger touch: `TOUCH.PAN`, `TOUCH.ROTATE`, or `undefined`. */
  override touches: ControlTouches = { ONE: TOUCH.PAN };

  #selected: Node | undefined = undefined;
  #hovered: Node | undefined = undefined;

  readonly #event: {
    type: string;
    object: Node | undefined;
    [key: string]: unknown;
  } = {
    type: "",
    object: undefined,
  };

  readonly #onPointerMove = (event: Event): void =>
    this.#handlePointerMove(event as DragPointerEvent);
  readonly #onPointerDown = (event: Event): void =>
    this.#handlePointerDown(event as DragPointerEvent);
  readonly #onPointerCancel = (): void => this.#handlePointerCancel();
  readonly #onContextMenu = (event: Event): void => {
    if (this.enabled === false) return;
    event.preventDefault();
  };

  /**
   * Creates drag controls.
   *
   * @param objects Draggable objects, held by reference.
   * @param camera Camera used to build picking rays.
   * @param domElement Element for pointer listeners; listeners connect when given.
   */
  constructor(objects: Node[], camera: Camera, domElement?: DragDomElement) {
    super(camera, domElement);
    this.objects = objects;
    if (domElement !== undefined) this.connect(domElement);
  }

  /** Adds pointer listeners and disables browser touch scrolling. */
  override connect(element: DragDomElement): void {
    super.connect(element);
    element.addEventListener("pointermove", this.#onPointerMove);
    element.addEventListener("pointerdown", this.#onPointerDown);
    element.addEventListener("pointerup", this.#onPointerCancel);
    element.addEventListener("pointerleave", this.#onPointerCancel);
    element.addEventListener("contextmenu", this.#onContextMenu);
    if (element.style) element.style.touchAction = "none";
  }

  /** Removes pointer listeners and restores touch scrolling and the cursor. */
  override disconnect(): void {
    const element = this.domElement;
    if (element === undefined) return;
    element.removeEventListener("pointermove", this.#onPointerMove);
    element.removeEventListener("pointerdown", this.#onPointerDown);
    element.removeEventListener("pointerup", this.#onPointerCancel);
    element.removeEventListener("pointerleave", this.#onPointerCancel);
    element.removeEventListener("contextmenu", this.#onContextMenu);
    if (element.style) element.style.touchAction = "";
    if (element.style) element.style.cursor = "";
  }

  /** Removes all listeners. */
  override dispose(): void {
    this.disconnect();
  }

  #dispatch(type: string, object: Node): void {
    const event = this.#event;
    event.type = type;
    event.object = object;
    this.dispatchEvent(event);
    event.object = undefined;
  }

  #updatePointer(element: DragDomElement, event: DragPointerEvent): void {
    const rect = element.getBoundingClientRect();
    _pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = (-(event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  #updateState(event: DragPointerEvent): void {
    let action: number | undefined;
    if (event.pointerType === "touch") {
      action = this.touches.ONE;
    } else {
      switch (event.button) {
        case 0:
          action = this.mouseButtons.LEFT;
          break;
        case 1:
          action = this.mouseButtons.MIDDLE;
          break;
        case 2:
          action = this.mouseButtons.RIGHT;
          break;
        default:
          action = undefined;
      }
    }
    // Matches three.js: MOUSE and TOUCH values share one switch.
    switch (action) {
      case MOUSE.PAN:
      case TOUCH.PAN:
        this.state = STATE.PAN;
        break;
      case MOUSE.ROTATE:
        this.state = STATE.ROTATE;
        break;
      default:
        this.state = STATE.NONE;
    }
  }

  #handlePointerMove(event: DragPointerEvent): void {
    const element = this.domElement;
    if (this.enabled === false || element === undefined) return;
    const camera = this.object;
    const raycaster = this.raycaster;
    this.#updatePointer(element, event);
    raycaster.setFromCamera(_pointer, camera);
    const selected = this.#selected;
    if (selected !== undefined) {
      if (this.state === STATE.PAN) {
        if (raycaster.ray.intersectPlane(_plane, _intersection)) {
          selected.position.copy(
            _intersection.sub(_offset).applyMatrix4(_inverseMatrix),
          );
          this.#dispatch("drag", selected);
        }
      } else if (this.state === STATE.ROTATE) {
        _diff
          .subVectors(_pointer, _previousPointer)
          .multiplyScalar(this.rotateSpeed);
        selected.rotateOnWorldAxis(_up, _diff.x);
        selected.rotateOnWorldAxis(_right.normalize(), -_diff.y);
        this.#dispatch("drag", selected);
      }
    } else if (event.pointerType === "mouse" || event.pointerType === "pen") {
      _intersections.length = 0;
      raycaster.intersectObjects(this.objects, this.recursive, _intersections);
      const hit = _intersections[0];
      if (hit !== undefined) {
        const object = hit.object as Node;
        _plane.setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(_plane.normal),
          _worldPosition.setFromMatrixPosition(object.matrixWorld),
        );
        if (this.#hovered !== object && this.#hovered !== undefined) {
          this.#dispatch("hoveroff", this.#hovered);
          if (element.style) element.style.cursor = "auto";
          this.#hovered = undefined;
        }
        if (this.#hovered !== object) {
          this.#dispatch("hoveron", object);
          if (element.style) element.style.cursor = "pointer";
          this.#hovered = object;
        }
      } else if (this.#hovered !== undefined) {
        this.#dispatch("hoveroff", this.#hovered);
        if (element.style) element.style.cursor = "auto";
        this.#hovered = undefined;
      }
      _intersections.length = 0;
    }
    _previousPointer.copy(_pointer);
  }

  #handlePointerDown(event: DragPointerEvent): void {
    const element = this.domElement;
    if (this.enabled === false || element === undefined) return;
    const camera = this.object;
    const raycaster = this.raycaster;
    this.#updatePointer(element, event);
    this.#updateState(event);
    _intersections.length = 0;
    raycaster.setFromCamera(_pointer, camera);
    raycaster.intersectObjects(this.objects, this.recursive, _intersections);
    const hit = _intersections[0];
    _intersections.length = 0;
    if (hit !== undefined) {
      const picked = hit.object as Node;
      const selected = this.transformGroup ? findGroup(picked) : picked;
      this.#selected = selected;
      if (selected !== undefined) {
        _plane.setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(_plane.normal),
          _worldPosition.setFromMatrixPosition(selected.matrixWorld),
        );
        if (raycaster.ray.intersectPlane(_plane, _intersection)) {
          if (this.state === STATE.PAN) {
            if (selected.parent !== undefined)
              _inverseMatrix.copy(selected.parent.matrixWorld).invert();
            else _inverseMatrix.identity();
            _offset
              .copy(_intersection)
              .sub(_worldPosition.setFromMatrixPosition(selected.matrixWorld));
            if (element.style) element.style.cursor = "move";
            this.#dispatch("dragstart", selected);
          } else if (this.state === STATE.ROTATE) {
            // Like three.js, rotation assumes a +Y-up camera.
            _up.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
            _right.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
            if (element.style) element.style.cursor = "move";
            this.#dispatch("dragstart", selected);
          }
        }
      }
    }
    _previousPointer.copy(_pointer);
  }

  #handlePointerCancel(): void {
    const element = this.domElement;
    if (this.enabled === false || element === undefined) return;
    if (this.#selected !== undefined) {
      this.#dispatch("dragend", this.#selected);
      this.#selected = undefined;
    }
    if (element.style)
      element.style.cursor = this.#hovered !== undefined ? "pointer" : "auto";
    this.state = STATE.NONE;
  }
}

/** Returns the outermost `Group` above and including `object`. */
function findGroup(object: Node): Node | undefined {
  let group: Node | undefined;
  for (let node: Node | undefined = object; node; node = node.parent) {
    if ((node as { isGroup?: boolean }).isGroup === true) group = node;
  }
  return group;
}

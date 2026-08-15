import { EventDispatcher } from "../core/EventDispatcher.ts";
import { Node } from "../core/Node.ts";
import { type RaycastCamera, Raycaster } from "../core/Raycaster.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
  type ControlDomElement,
  type ControlEvent,
  prevent,
} from "./ControlDom.ts";

/** Public event payload dispatched by `DragControls`. */
export interface DragControlsEvent {
  /** Event name (`hoveron`, `hoveroff`, `dragstart`, `drag`, or `dragend`). */
  type: string;
  /** Object currently hovered or dragged. */
  object: Node;
  /** Current world-space pointer position when available. */
  point?: Vector3;
}

const _normal = new Vector3();
const _world = new Vector3();
const _target = new Vector3();

/** CPU raycast-and-plane dragging for EASEL nodes. */
export class DragControls extends EventDispatcher {
  /** Objects eligible for picking and dragging. */
  objects: Node[];
  /** Camera used to construct pointer rays. */
  camera: RaycastCamera;
  /** Event target receiving pointer listeners. */
  domElement: ControlDomElement;
  /** Reusable CPU raycaster. */
  raycaster: Raycaster;
  /** Enables input when true. */
  enabled: boolean = true;
  /** Recursively tests descendants of objects. */
  recursive = false;
  /** Moves the selected group root instead of the intersected child. */
  transformGroup: boolean = false;

  #selected: Node | undefined;
  #hovered: Node | undefined;
  readonly #offset = new Vector3();
  readonly #planePoint = new Vector3();
  #planeConstant = 0;
  readonly #listeners: Array<[string, EventListener]> = [];
  #pointerId = -1;

  /** Creates drag controls and installs listeners on `domElement`. */
  constructor(
    objects: readonly Node[],
    camera: RaycastCamera,
    domElement: ControlDomElement,
    raycaster: Raycaster = new Raycaster(),
  ) {
    super();
    this.objects = [...objects];
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = raycaster;
    this.#listen("pointermove", this.#onPointerMove.bind(this));
    this.#listen("pointerdown", this.#onPointerDown.bind(this));
    this.#listen("pointerup", this.#onPointerUp.bind(this));
    this.#listen("pointercancel", this.#onPointerUp.bind(this));
    this.#listen("contextmenu", (event) => prevent(event));
    if (domElement.style) domElement.style.touchAction = "none";
  }

  /** Removes all installed DOM listeners and clears active selection. */
  dispose(): void {
    for (const [type, listener] of this.#listeners)
      this.domElement.removeEventListener(type, listener);
    this.#listeners.length = 0;
    this.#selected = undefined;
    this.#hovered = undefined;
  }

  /** Enables pointer interaction after `deactivate()`. */
  activate(): void {
    this.enabled = true;
  }

  /** Disables pointer interaction without removing listeners. */
  deactivate(): void {
    this.enabled = false;
    this.#selected = undefined;
  }

  #listen(type: string, listener: EventListener): void {
    this.domElement.addEventListener(type, listener);
    this.#listeners.push([type, listener]);
  }

  #setPointer(event: ControlEvent): void {
    const width = this.domElement.clientWidth ?? 800;
    const height = this.domElement.clientHeight ?? 600;
    const rect = this.domElement.getBoundingClientRect?.();
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    const x = ((event.clientX ?? 0) - left) / (rect?.width ?? width);
    const y = ((event.clientY ?? 0) - top) / (rect?.height ?? height);
    this.raycaster.setFromCamera({ x: x * 2 - 1, y: 1 - y * 2 }, this.camera);
  }

  #pick(event: ControlEvent): Node | undefined {
    this.#setPointer(event);
    const hit = this.raycaster.intersectObjects(
      this.objects,
      this.recursive,
    )[0];
    return hit?.object instanceof Node ? hit.object : undefined;
  }

  #onPointerDown(raw: Event): void {
    if (!this.enabled || ((raw as ControlEvent).button ?? 0) !== 0) return;
    const event = raw as ControlEvent;
    const picked = this.#pick(event);
    if (!picked) return;
    this.#selected = this.transformGroup ? (picked.parent ?? picked) : picked;
    this.#pointerId = event.pointerId ?? 0;
    this.domElement.setPointerCapture?.(this.#pointerId);
    this.#selected.getWorldPosition(_world);
    this.#planePoint.copy(_world);
    const elements = this.camera.matrixWorld.elements;
    _normal.set(elements[8], elements[9], elements[10]).normalize();
    this.#planeConstant = -_normal.dot(this.#planePoint);
    const point = this.raycaster.ray.intersectPlane(
      { normal: _normal, constant: this.#planeConstant },
      _target,
    );
    this.#offset.copy(point ?? _world).sub(_world);
    this.dispatchEvent({ type: "dragstart", object: this.#selected });
  }

  #onPointerMove(raw: Event): void {
    if (!this.enabled) return;
    const event = raw as ControlEvent;
    if (this.#selected) {
      if ((event.pointerId ?? 0) !== this.#pointerId) return;
      this.#setPointer(event);
      const point = this.raycaster.ray.intersectPlane(
        { normal: _normal, constant: this.#planeConstant },
        _target,
      );
      if (!point) return;
      _world.copy(point).sub(this.#offset);
      if (this.#selected.parent) this.#selected.parent.worldToLocal(_world);
      this.#selected.position.copy(_world);
      this.#selected.matrixWorldNeedsUpdate = true;
      this.dispatchEvent({
        type: "drag",
        object: this.#selected,
        point: point.clone(),
      });
      return;
    }
    const picked = this.#pick(event);
    if (picked === this.#hovered) return;
    if (this.#hovered)
      this.dispatchEvent({ type: "hoveroff", object: this.#hovered });
    this.#hovered = picked;
    if (picked) this.dispatchEvent({ type: "hoveron", object: picked });
  }

  #onPointerUp(raw: Event): void {
    const event = raw as ControlEvent;
    if (!this.#selected || (event.pointerId ?? 0) !== this.#pointerId) return;
    this.domElement.releasePointerCapture?.(this.#pointerId);
    this.dispatchEvent({ type: "dragend", object: this.#selected });
    this.#selected = undefined;
    this.#pointerId = -1;
  }
}

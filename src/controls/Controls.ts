import { EventDispatcher } from "../core/EventDispatcher.ts";
import type { Node } from "../core/Node.ts";

/**
 * Base class for input controls that manipulate a scene-graph node.
 *
 * Stores the controlled {@link Node}, an optional event target, and the common
 * enabled state shared by concrete controls. The lifecycle methods define the
 * control contract: subclasses can attach and remove input listeners in
 * `connect` and `disconnect`, release them in `dispose`, and advance their
 * state from a render loop with `update`.
 *
 * Extends {@link EventDispatcher} so subclasses can dispatch and listen for
 * control events using the standard `addEventListener` and `dispatchEvent`
 * API.
 */
export class Controls extends EventDispatcher {
  /** Scene-graph node whose transform or state the controls manipulate. */
  object: Node;

  /** Event target that receives pointer, wheel, and keyboard listeners. */
  domElement: EventTarget | undefined;

  /** When false, all interaction is ignored. */
  enabled: boolean = true;

  /**
   * Creates controls bound to `object` and optionally connected to `domElement`.
   *
   * @param object  The scene-graph object to control.
   * @param domElement The event target for input listeners, if any.
   */
  constructor(object: Node, domElement?: EventTarget) {
    super();
    this.object = object;
    this.domElement = domElement;
  }

  /**
   * Connects the controls to a DOM element. If already connected, the
   * previous element is disconnected first.
   *
   * @param element The DOM element to connect to.
   */
  connect(element: EventTarget): void {
    if (this.domElement !== undefined) this.disconnect();
    this.domElement = element;
  }

  /** Disconnects the controls from the current DOM element. Subclasses override to remove listeners. */
  disconnect(): void {
    /* no-op base stub; subclasses override to remove listeners */
  }

  /** Frees internal resources and removes all event listeners. Subclasses override to clean up. */
  dispose(): void {
    /* no-op base stub; subclasses override to clean up */
  }

  /**
   * Per-frame update hook. Subclasses override to advance internal state.
   *
   * @param _delta Time delta in seconds (unused by default).
   */
  update(_delta?: number): void {
    /* no-op base stub; subclasses override */
  }
}

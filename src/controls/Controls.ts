import { EventDispatcher } from "../core/EventDispatcher.ts";
import { Node } from "../core/Node.ts";

/**
 * Abstract base class for controls. Provides the shared `object`, `domElement`,
 * and `enabled` state plus no-op `connect`, `disconnect`, `dispose`, and
 * `update` stubs that concrete controls override.
 *
 * Extends {@link EventDispatcher} so subclasses can dispatch and listen for
 * events using the standard `addEventListener` / `dispatchEvent` API.
 */
export class Controls extends EventDispatcher {
  /** The scene-graph object managed by the controls. */
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
  disconnect(): void {}

  /** Frees internal resources and removes all event listeners. Subclasses override to clean up. */
  dispose(): void {}

  /**
   * Per-frame update hook. Subclasses override to advance internal state.
   *
   * @param _delta Time delta in seconds (unused by default).
   */
  update(_delta?: number): void {}
}

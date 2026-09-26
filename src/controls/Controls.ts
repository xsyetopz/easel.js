import type { MOUSE, TOUCH } from "../core/Constants.ts";
import { EventDispatcher } from "../core/EventDispatcher.ts";
import type { Node } from "../core/Node.ts";
import type { ControlDomElement } from "./ControlDom.ts";

/** Actions assigned to the left, middle, and right mouse buttons. */
export interface ControlMouseButtons {
  /** Action for the primary (left) button, or `undefined` for none. */
  LEFT: MOUSE | undefined;
  /** Action for the auxiliary (middle) button, or `undefined` for none. */
  MIDDLE: MOUSE | undefined;
  /** Action for the secondary (right) button, or `undefined` for none. */
  RIGHT: MOUSE | undefined;
}

/** Actions assigned to one- and two-finger touch gestures. */
export interface ControlTouches {
  /** Action for a one-finger gesture, or `undefined` for none. */
  ONE: TOUCH | undefined;
  /** Action for a two-finger gesture, or `undefined` for none; omitted by one-finger controls. */
  TWO?: TOUCH | undefined;
}

/**
 * Base class for input controls that manipulate a scene-graph node.
 *
 * Mirrors the three.js `Controls` base class: it stores the controlled
 * {@link Node}, an optional event target, the enabled flag, the internal
 * interaction `state`, and the `keys`, `mouseButtons`, and `touches` input
 * maps. Subclasses attach listeners in `connect`, remove them in `disconnect`,
 * release everything in `dispose`, and advance per-frame state in `update`.
 *
 * Extends {@link EventDispatcher} so subclasses can dispatch and listen for
 * control events using the standard `addEventListener` and `dispatchEvent`
 * API.
 *
 * @typeParam TObject Scene-graph node type the controls manipulate.
 */
export class Controls<TObject extends Node = Node> extends EventDispatcher {
  /** Scene-graph node whose transform or state the controls manipulate. */
  object: TObject;

  /** Event target that receives pointer, wheel, and keyboard listeners. */
  domElement: ControlDomElement | undefined;

  /** When false, all interaction is ignored. */
  enabled: boolean = true;

  /** Internal interaction state; `-1` means no active interaction. */
  state: number = -1;

  /** Keyboard input map; each control defines its own keys. */
  keys: object = {};

  /** Actions assigned to the mouse buttons; unsupported buttons stay `undefined`. */
  mouseButtons: ControlMouseButtons = {
    LEFT: undefined,
    MIDDLE: undefined,
    RIGHT: undefined,
  };

  /** Actions assigned to touch gestures; unsupported gestures stay `undefined`. */
  touches: ControlTouches = { ONE: undefined, TWO: undefined };

  /**
   * Creates controls bound to `object` and optionally connected to `domElement`.
   *
   * @param object  The scene-graph object to control.
   * @param domElement The event target for input listeners, if any.
   */
  constructor(object: TObject, domElement?: ControlDomElement) {
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
  connect(element: ControlDomElement): void {
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

import { Node } from "../core/Node.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import { getAudioContext } from "./AudioContext.ts";
import type {
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
} from "./AudioTypes.ts";

const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();
const _forward = new Vector3();
const _up = new Vector3();

type GainNode = AudioNodeLike & {
  gain: AudioParamLike & {
    setTargetAtTime?: (value: number, time: number, tau: number) => void;
  };
};

function isGainNode(node: AudioNodeLike | undefined): node is GainNode {
  return node !== undefined && "gain" in node;
}

/**
 * Virtual listener for positional and non-positional audio. Usually a child
 * of the camera so the camera transform represents the listener transform.
 */
export class AudioListener extends Node {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "AudioListener";

  /** The native audio context backing this listener, or `undefined`. */
  readonly context: AudioContextLike | undefined;

  /** Gain node used for master volume control, or `undefined` when unavailable. */
  readonly gain: AudioNodeLike | undefined;

  #filter: AudioNodeLike | undefined = undefined;

  /** Current filter node, or `undefined`. */
  get filter(): AudioNodeLike | undefined {
    return this.#filter;
  }

  /** Sets the filter node without reconnecting audio nodes. */
  set filter(value: AudioNodeLike | undefined) {
    this.#filter = value;
  }

  /** Time delta in seconds since the last matrix update. */
  timeDelta: number = 0;

  #lastTime: number = 0;

  /** Constructs an audio listener and connects its gain to the destination. */
  constructor() {
    super();
    this.context = getAudioContext();
    if (!this.context) {
      this.gain = undefined;
      return;
    }
    this.gain = this.context.createGain?.();
    if (this.gain) {
      try {
        this.gain.connect(this.context.destination);
      } catch {
        // Context may be closed or unavailable.
      }
    }
  }

  /** Listener's input gain node, or `undefined`. */
  get input(): AudioNodeLike | undefined {
    return this.gain;
  }

  /** Removes the current filter and reconnects gain to the destination. */
  removeFilter(): this {
    if (!(this.#filter && this.context && this.gain)) return this;
    try {
      this.gain.disconnect?.(this.#filter);
      this.#filter.disconnect?.(this.context.destination);
      this.gain.connect(this.context.destination);
    } catch {
      // Nodes may already be disconnected.
    }
    this.#filter = undefined;
    return this;
  }

  /** Current filter, or `undefined`. */
  get currentFilter(): AudioNodeLike | undefined {
    return this.#filter;
  }

  /** Sets a filter between the gain and the destination. */
  applyFilter(value: AudioNodeLike): this {
    if (!(this.context && this.gain)) return this;
    if (this.#filter !== undefined) {
      try {
        this.gain.disconnect?.(this.#filter);
        this.#filter.disconnect?.(this.context.destination);
      } catch {
        // Fall through to reconnection.
      }
    } else {
      try {
        this.gain.disconnect?.(this.context.destination);
      } catch {
        // Fall through.
      }
    }
    this.#filter = value;
    try {
      this.gain.connect(this.#filter);
      this.#filter.connect(this.context.destination);
    } catch {
      // Context may be closed.
    }
    return this;
  }

  /** Current master volume, or `0` when unavailable. */
  get masterVolume(): number {
    if (!isGainNode(this.gain)) return 0;
    return this.gain.gain.value;
  }

  /** Sets the master volume affecting all connected audio nodes. */
  set masterVolume(value: number) {
    if (!(isGainNode(this.gain) && this.context)) return;
    try {
      this.gain.gain.setTargetAtTime?.(value, this.context.currentTime, 0.01);
    } catch {
      // Fallback: direct set.
      this.gain.gain.value = value;
    }
  }

  /** Updates the native listener position and orientation from the world matrix. */
  override updateMatrixWorld(force: boolean = false): void {
    super.updateMatrixWorld(force);

    if (!this.context) return;
    const listener = this.context.listener;
    if (!listener) return;

    const now = this.context.currentTime;
    this.timeDelta = Math.max(0, now - this.#lastTime);
    this.#lastTime = now;

    this.matrixWorld.decompose(_position, _quaternion, _scale);
    _forward.set(0, 0, -1).applyQuaternion(_quaternion);
    _up.set(0, 1, 0).applyQuaternion(_quaternion);

    if (listener.positionX) {
      const endTime = now + this.timeDelta;
      try {
        listener.positionX.linearRampToValueAtTime?.(_position.x, endTime);
        listener.positionY?.linearRampToValueAtTime?.(_position.y, endTime);
        listener.positionZ?.linearRampToValueAtTime?.(_position.z, endTime);
        listener.forwardX?.linearRampToValueAtTime?.(_forward.x, endTime);
        listener.forwardY?.linearRampToValueAtTime?.(_forward.y, endTime);
        listener.forwardZ?.linearRampToValueAtTime?.(_forward.z, endTime);
        listener.upX?.linearRampToValueAtTime?.(_up.x, endTime);
        listener.upY?.linearRampToValueAtTime?.(_up.y, endTime);
        listener.upZ?.linearRampToValueAtTime?.(_up.z, endTime);
      } catch {
        // Ramp may fail on closed context.
      }
    } else {
      try {
        listener.setPosition?.(_position.x, _position.y, _position.z);
        listener.setOrientation?.(
          _forward.x,
          _forward.y,
          _forward.z,
          _up.x,
          _up.y,
          _up.z,
        );
      } catch {
        // Legacy API may be unavailable.
      }
    }
  }
}

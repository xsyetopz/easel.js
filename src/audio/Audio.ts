import { Node } from "../core/Node.ts";
import { warn } from "../utils/ConsoleUtils.ts";
import type { AudioListener } from "./AudioListener.ts";
import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
} from "./AudioTypes.ts";

/** Source type identifying how the Audio was initialized. */
export type AudioSourceType =
  | "empty"
  | "audioNode"
  | "mediaNode"
  | "mediaStreamNode"
  | "buffer";

type GainNode = AudioNodeLike & { gain: AudioParamLike };

function isGainNode(node: AudioNodeLike | undefined): node is GainNode {
  return node !== undefined && "gain" in node;
}

/**
 * Non-positional (global) audio object backed by the Web Audio API.
 * Use an {@link AudioListener} and an {@link AudioLoader} to load and play sounds.
 */
export class Audio extends Node {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "Audio";

  /** Listener that supplies the shared audio context and output destination. */
  readonly listener: AudioListener;

  /** The native audio context, or `undefined` when unavailable. */
  readonly context: AudioContextLike | undefined;

  /** Gain node used for volume control, or `undefined`. */
  readonly gain: AudioNodeLike | undefined;

  /** Whether playback starts automatically after a buffer is set. */
  autoplay: boolean = false;

  /** Decoded audio buffer, or `undefined` until set. */
  buffer: AudioBufferLike | undefined = undefined;

  /** Pitch modification in cents; +/- 100 is a semitone. */
  detune: number = 0;

  /** Whether the audio loops. */
  loop: boolean = false;

  /** Loop start position in seconds. */
  loopStart: number = 0;

  /** Loop end position in seconds. */
  loopEnd: number = 0;

  /** Playback offset in seconds. */
  offset: number = 0;

  /** Optional override for playback duration. */
  duration: number | undefined = undefined;

  /** Playback rate multiplier. */
  playbackRate: number = 1;

  /** Whether the audio is currently playing. */
  isPlaying: boolean = false;

  /** Whether playback can be controlled with play/pause/stop. */
  hasPlaybackControl: boolean = true;

  /** Current audio source node, or `undefined`. */
  source: AudioBufferSourceNodeLike | AudioNodeLike | undefined = undefined;

  /** Source type identifying how this Audio was initialized. */
  sourceType: AudioSourceType = "empty";

  /** Filter chain applied to the audio signal. */
  filters: AudioNodeLike[] = [];

  #startedAt: number = 0;
  #progress: number = 0;
  #connected: boolean = false;

  /** Constructs a non-positional audio bound to the given listener. */
  constructor(listener: AudioListener) {
    super();
    this.listener = listener;
    this.context = listener.context;
    this.gain = this.context?.createGain?.();
    const input = listener.input;
    if (this.gain && input) {
      try {
        this.gain.connect(input);
      } catch {
        // Context may be closed.
      }
    }
  }

  /** Output gain node, or `undefined`. */
  get output(): AudioNodeLike | undefined {
    return this.gain;
  }

  /** Sets an audio node as the source, disabling playback control. */
  setNodeSource(audioNode: AudioNodeLike): this {
    this.hasPlaybackControl = false;
    this.sourceType = "audioNode";
    this.source = audioNode;
    this.connect();
    return this;
  }

  /** Sets a media element as the source, disabling playback control. */
  setMediaElementSource(mediaElement: HTMLMediaElement): this {
    if (!this.context?.createMediaElementSource) return this;
    this.hasPlaybackControl = false;
    this.sourceType = "mediaNode";
    this.source = this.context.createMediaElementSource(mediaElement);
    this.connect();
    return this;
  }

  /** Sets a media stream as the source, disabling playback control. */
  setMediaStreamSource(mediaStream: MediaStream): this {
    if (!this.context?.createMediaStreamSource) return this;
    this.hasPlaybackControl = false;
    this.sourceType = "mediaStreamNode";
    this.source = this.context.createMediaStreamSource(mediaStream);
    this.connect();
    return this;
  }

  /** Sets a decoded audio buffer as the source, enabling playback control. */
  setBuffer(audioBuffer: AudioBufferLike): this {
    this.buffer = audioBuffer;
    this.sourceType = "buffer";
    if (this.autoplay) this.play();
    return this;
  }

  /** Starts playback after an optional delay in seconds. */
  play(delay: number = 0): this | undefined {
    if (this.isPlaying) {
      warn("Audio", "Audio is already playing.");
      return;
    }
    if (!this.hasPlaybackControl) {
      warn("Audio", "this Audio has no playback control.");
      return;
    }
    if (!(this.context?.createBufferSource && this.buffer)) return this;

    this.#startedAt = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.loop = this.loop;
    source.loopStart = this.loopStart;
    source.loopEnd = this.loopEnd;
    source.onended = this.onEnded.bind(this);
    source.start?.(
      this.#startedAt,
      this.#progress + this.offset,
      this.duration,
    );

    this.isPlaying = true;
    this.source = source;
    this.applyDetune(this.detune);
    this.applyPlaybackRate(this.playbackRate);
    return this.connect();
  }

  /** Pauses playback, preserving progress. */
  pause(): this | undefined {
    if (!this.hasPlaybackControl) {
      warn("Audio", "this Audio has no playback control.");
      return;
    }
    if (this.isPlaying && this.source && this.context) {
      this.#progress +=
        Math.max(this.context.currentTime - this.#startedAt, 0) *
        this.playbackRate;
      if (this.loop) {
        const dur = this.duration ?? this.buffer?.duration ?? 1;
        this.#progress = this.#progress % dur;
      }
      (this.source as AudioBufferSourceNodeLike).stop?.();
      (this.source as AudioBufferSourceNodeLike).onended = undefined;
      this.isPlaying = false;
    }
    return this;
  }

  /** Stops playback and resets progress. */
  stop(delay: number = 0): this | undefined {
    if (!this.hasPlaybackControl) {
      warn("Audio", "this Audio has no playback control.");
      return;
    }
    this.#progress = 0;
    if (this.source && this.context) {
      (this.source as AudioBufferSourceNodeLike).stop?.(
        this.context.currentTime + delay,
      );
      (this.source as AudioBufferSourceNodeLike).onended = undefined;
    }
    this.isPlaying = false;
    return this;
  }

  /** Connects the source through the filter chain to the output. */
  connect(): this {
    if (!(this.source && this.gain)) return this;
    try {
      if (this.filters.length > 0) {
        const first = this.filters.at(0);
        if (first) this.source.connect(first);
        for (let i = 1; i < this.filters.length; i++) {
          const prev = this.filters[i - 1];
          const next = this.filters[i];
          if (prev && next) prev.connect(next);
        }
        this.filters.at(-1)?.connect(this.gain);
      } else {
        this.source.connect(this.gain);
      }
      this.#connected = true;
    } catch {
      // Source or gain may belong to a closed context.
    }
    return this;
  }

  /** Disconnects the source from the output. */
  disconnect(): this | undefined {
    if (!(this.#connected && this.source && this.gain)) return;
    try {
      if (this.filters.length > 0) {
        const first = this.filters.at(0);
        if (first) this.source.disconnect?.(first);
        for (let i = 1; i < this.filters.length; i++) {
          const prev = this.filters[i - 1];
          const next = this.filters[i];
          if (prev && next) prev?.disconnect?.(next);
        }
        this.filters.at(-1)?.disconnect?.(this.gain);
      } else {
        this.source.disconnect?.(this.gain);
      }
      this.#connected = false;
    } catch {
      // Already disconnected.
    }
    return this;
  }

  /** Replaces the filter chain and reconnects the source. */
  setFilters(value: AudioNodeLike[] = []): this {
    if (this.#connected) this.disconnect();
    this.filters = value.slice();
    this.connect();
    return this;
  }

  /** Sets the detune in cents. */
  applyDetune(value: number): this {
    this.detune = value;
    if (this.isPlaying) {
      const source = this.source as AudioBufferSourceNodeLike;
      if (source.detune) {
        try {
          source.detune.setTargetAtTime?.(
            value,
            this.context?.currentTime ?? 0,
            0.01,
          );
        } catch {
          source.detune.value = value;
        }
      }
    }
    return this;
  }

  /** First filter in the chain, or `undefined`. */
  get firstFilter(): AudioNodeLike | undefined {
    return this.filters[0];
  }

  /** First filter in the chain, or `undefined`. */
  get filter(): AudioNodeLike | undefined {
    return this.filters[0];
  }

  /** Replaces the filter chain with a single filter. */
  applyFilter(filter: AudioNodeLike | undefined): this {
    return this.setFilters(filter ? [filter] : []);
  }

  /** Sets the playback rate. */
  applyPlaybackRate(value: number): this | undefined {
    if (!this.hasPlaybackControl) {
      warn("Audio", "this Audio has no playback control.");
      return;
    }
    this.playbackRate = value;
    if (this.isPlaying) {
      const source = this.source as AudioBufferSourceNodeLike;
      if (source.playbackRate) {
        try {
          source.playbackRate.setTargetAtTime?.(
            value,
            this.context?.currentTime ?? 0,
            0.01,
          );
        } catch {
          source.playbackRate.value = value;
        }
      }
    }
    return this;
  }

  /** Called automatically when playback finishes. */
  onEnded(): void {
    this.isPlaying = false;
    this.#progress = 0;
  }

  /** Sets the loop flag. */
  applyLoop(value: boolean): this | undefined {
    if (!this.hasPlaybackControl) {
      warn("Audio", "this Audio has no playback control.");
      return;
    }
    this.loop = value;
    if (this.isPlaying) {
      (this.source as AudioBufferSourceNodeLike).loop = value;
    }
    return this;
  }

  /** Sets the loop start position in seconds. */
  applyLoopStart(value: number): this {
    this.loopStart = value;
    return this;
  }

  /** Sets the loop end position in seconds. */
  applyLoopEnd(value: number): this {
    this.loopEnd = value;
    return this;
  }

  /** Current volume, or `0` when the gain node is unavailable. */
  get volume(): number {
    if (!isGainNode(this.gain)) return 0;
    return this.gain.gain.value;
  }

  /** Sets the volume in [0, 1]. */
  set volume(value: number) {
    if (!(isGainNode(this.gain) && this.context)) return;
    try {
      this.gain.gain.setTargetAtTime?.(value, this.context.currentTime, 0.01);
    } catch {
      this.gain.gain.value = value;
    }
  }

  /** Sets detune in cents and applies it to a playing source. */
  setDetune(value: number): this {
    this.detune = value;
    if (this.isPlaying) {
      const source = this.source as AudioBufferSourceNodeLike;
      if (source.detune) {
        try {
          source.detune.setTargetAtTime?.(
            value,
            this.context?.currentTime ?? 0,
            0.01,
          );
        } catch {
          source.detune.value = value;
        }
      }
    }
    return this;
  }

  /** Sets the loop flag and applies it to a playing source. */
  setLoop(value: boolean): this {
    this.loop = value;
    if (this.isPlaying) {
      (this.source as AudioBufferSourceNodeLike).loop = value;
    }
    return this;
  }

  /** Sets the loop end position and applies it to a playing source. */
  setLoopEnd(value: number): this {
    this.loopEnd = value;
    if (this.isPlaying) {
      (this.source as AudioBufferSourceNodeLike).loopEnd = value;
    }
    return this;
  }

  /** Sets the loop start position and applies it to a playing source. */
  setLoopStart(value: number): this {
    this.loopStart = value;
    if (this.isPlaying) {
      (this.source as AudioBufferSourceNodeLike).loopStart = value;
    }
    return this;
  }

  /** Sets the playback rate and applies it to a playing source. */
  setPlaybackRate(value: number): this {
    this.playbackRate = value;
    if (this.isPlaying) {
      const source = this.source as AudioBufferSourceNodeLike;
      if (source.playbackRate) {
        try {
          source.playbackRate.setTargetAtTime?.(
            value,
            this.context?.currentTime ?? 0,
            0.01,
          );
        } catch {
          source.playbackRate.value = value;
        }
      }
    }
    return this;
  }

  /** Copies buffer-source state from `source` and returns `this`. */
  override copy(source: Audio, recursive: boolean = true): this {
    super.copy(source, recursive);
    if (source.sourceType !== "buffer") {
      warn("Audio", "Audio source type cannot be copied.");
      return this;
    }
    this.autoplay = source.autoplay;
    this.buffer = source.buffer;
    this.detune = source.detune;
    this.loop = source.loop;
    this.loopStart = source.loopStart;
    this.loopEnd = source.loopEnd;
    this.offset = source.offset;
    this.duration = source.duration;
    this.playbackRate = source.playbackRate;
    this.hasPlaybackControl = source.hasPlaybackControl;
    this.sourceType = source.sourceType;
    this.filters = source.filters.slice();
    return this;
  }

  /** Clones this audio bound to the same listener. */
  override clone(recursive: boolean = true): Audio {
    return new (this.constructor as new (listener: AudioListener) => Audio)(
      this.listener,
    ).copy(this, recursive);
  }
}

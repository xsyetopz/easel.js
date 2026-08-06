import { AudioAnalyzer, type AudioAnalyzerOptions } from "./AudioAnalyzer.ts";
import type {
  AudioContextLike,
  AudioNodeLike,
  OscillatorNodeLike,
  StereoPannerNodeLike,
} from "./AudioTypes.ts";

/** Options controlling browser-context creation and graph output routing. */
export interface AudioGraphOptions {
  /** Existing context or `null` to intentionally disable Web Audio. */
  context?: AudioContextLike | null;
  /** Destination node replacing the context's default destination. */
  destination?: AudioNodeLike;
  /** Master gain applied before the destination. */
  masterVolume?: number;
}

/** A lifecycle-safe, typed Web Audio graph with a no-audio fallback. */
export class AudioGraph {
  readonly #context: AudioContextLike | null;
  readonly #output: AudioNodeLike | null;
  readonly #nodes = new Set<AudioNodeLike>();
  readonly #analyzers = new Set<AudioAnalyzer>();
  readonly #ownsContext: boolean;
  #disposed = false;

  /** Creates a graph using an injected context or the browser's AudioContext. */
  constructor(options: AudioGraphOptions = {}) {
    const supplied = options.context;
    this.#ownsContext = supplied === undefined;
    this.#context =
      supplied === undefined ? createBrowserAudioContext() : supplied;
    if (!this.#context) {
      this.#output = null;
      return;
    }

    const destination = options.destination ?? this.#context.destination;
    let output: AudioNodeLike = destination;
    try {
      const gain = this.#context.createGain?.();
      if (gain) {
        gain.connect(destination);
        output = gain;
        this.#nodes.add(gain);
        const volume = options.masterVolume ?? 1;
        setAudioParam(
          gain.gain,
          clamp(volume, 0, 1),
          this.#context.currentTime,
        );
      }
    } catch {
      output = destination;
    }
    this.#output = output;
  }

  /** Browser context owned by this graph, or `null` when unavailable. */
  get context(): AudioContextLike | null {
    return this.#context;
  }

  /** Whether this graph can route audio through a live context. */
  get available(): boolean {
    return this.#context !== null && !this.#disposed;
  }

  /** Master output node, or `null` when audio is unavailable. */
  get output(): AudioNodeLike | null {
    return this.#output;
  }

  /** Sets the master output volume and returns this graph. */
  setMasterVolume(value: number): this {
    if (!(this.#output && this.#context) || this.#disposed) return this;
    const gain = this.#output as AudioNodeLike & { gain?: { value: number } };
    if (gain.gain)
      setAudioParam(gain.gain, clamp(value, 0, 1), this.#context.currentTime);
    return this;
  }

  /** Connects a source to the graph output, returning `null` on failure. */
  connect(source: AudioNodeLike | AudioNode | null): AudioNodeLike | null {
    if (!(source && this.#output) || this.#disposed) return null;
    try {
      const node = source as unknown as AudioNodeLike;
      node.connect(this.#output);
      this.#nodes.add(node);
      return node;
    } catch {
      return null;
    }
  }

  /** Creates and routes a media element source through this graph. */
  createMediaElementSource(element: HTMLMediaElement): AudioNodeLike | null {
    if (!this.#context?.createMediaElementSource || this.#disposed) return null;
    try {
      return this.connect(this.#context.createMediaElementSource(element));
    } catch {
      return null;
    }
  }

  /** Creates an oscillator without starting it or routing it. */
  createOscillator(): OscillatorNodeLike | null {
    if (!this.#context?.createOscillator || this.#disposed) return null;
    try {
      const oscillator = this.#context.createOscillator();
      this.#nodes.add(oscillator);
      return oscillator;
    } catch {
      return null;
    }
  }

  /** Creates and routes a stereo panner, or returns `null` when unsupported. */
  createStereoPanner(): StereoPannerNodeLike | null {
    if (!this.#context?.createStereoPanner || this.#disposed) return null;
    try {
      const panner = this.#context.createStereoPanner();
      this.#nodes.add(panner);
      this.connect(panner);
      return panner;
    } catch {
      return null;
    }
  }

  /** Creates a byte analyser and optionally attaches a source to it. */
  createAnalyzer(
    source: AudioNodeLike | null = null,
    options: AudioAnalyzerOptions = {},
  ): AudioAnalyzer {
    const analyzer = new AudioAnalyzer(this.#context, options);
    this.#analyzers.add(analyzer);
    analyzer.attach(source);
    return analyzer;
  }

  /** Resumes a suspended context, returning `false` when audio is unavailable. */
  async resume(): Promise<boolean> {
    if (!this.#context || this.#disposed) return false;
    try {
      await this.#context.resume?.();
      return true;
    } catch {
      return false;
    }
  }

  /** Suspends a context, returning `false` when audio is unavailable. */
  async suspend(): Promise<boolean> {
    if (!this.#context || this.#disposed) return false;
    try {
      await this.#context.suspend?.();
      return true;
    } catch {
      return false;
    }
  }

  /** Plays a short oscillator tone and returns the source node. */
  playTone(
    frequency = 440,
    duration = 0.08,
    type = "sine",
  ): OscillatorNodeLike | null {
    const oscillator = this.createOscillator();
    if (!(oscillator && this.#context)) return null;
    oscillator.type = type;
    setAudioParam(
      oscillator.frequency,
      Math.max(1, frequency),
      this.#context.currentTime,
    );
    if (!this.connect(oscillator)) return null;
    try {
      oscillator.start?.(this.#context.currentTime);
      oscillator.stop?.(this.#context.currentTime + Math.max(0, duration));
    } catch {
      return null;
    }
    return oscillator;
  }

  /** Disconnects graph nodes and closes an internally-created context. */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const analyzer of this.#analyzers) analyzer.dispose();
    this.#analyzers.clear();
    for (const node of this.#nodes) {
      try {
        node.disconnect?.();
      } catch {
        // Nodes from a closed context are already disconnected.
      }
    }
    this.#nodes.clear();
    if (this.#ownsContext) void this.#context?.close?.();
  }
}

/** Creates a browser AudioContext when the host exposes one. */
export function createBrowserAudioContext(): AudioContextLike | null {
  const scope = globalThis as typeof globalThis & {
    webkitAudioContext?: new () => AudioContextLike;
  };
  const Constructor = globalThis.AudioContext ?? scope.webkitAudioContext;
  if (!Constructor) return null;
  try {
    return new Constructor() as unknown as AudioContextLike;
  } catch {
    return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function setAudioParam(
  parameter: {
    value: number;
    setValueAtTime?: (value: number, time: number) => unknown;
  },
  value: number,
  time: number,
): void {
  try {
    parameter.setValueAtTime?.(value, time);
    parameter.value = value;
  } catch {
    parameter.value = value;
  }
}

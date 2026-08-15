import type {
  AnalyserNodeLike,
  AudioContextLike,
  AudioNodeLike,
} from "./AudioTypes.ts";

/** Options controlling an AudioAnalyzer's FFT and smoothing behavior. */
export interface AudioAnalyzerOptions {
  /** FFT size in samples; browser analysers require a power of two. */
  fftSize?: number;
  /** Exponential smoothing factor applied by the browser analyser. */
  smoothingTimeConstant?: number;
  /** Minimum decibel range used by the browser analyser. */
  minDecibels?: number;
  /** Maximum decibel range used by the browser analyser. */
  maxDecibels?: number;
}

/** Reads browser analyser data into reusable Canvas2D-friendly byte arrays. */
export class AudioAnalyzer {
  readonly #node: AnalyserNodeLike | null;
  readonly #frequencyData: Uint8Array;
  readonly #timeDomainData: Uint8Array;
  readonly #fallbackFftSize: number;
  #disposed: boolean = false;

  /** Creates an analyser from an AudioContext or an existing analyser node. */
  constructor(
    source:
      | AudioContextLike
      | AudioContext
      | AnalyserNodeLike
      | AnalyserNode
      | null,
    options: AudioAnalyzerOptions = {},
  ) {
    this.#node = resolveNode(source);
    const requestedFftSize = normalizeFftSize(options.fftSize ?? 128);
    if (this.#node) {
      try {
        this.#node.fftSize = requestedFftSize;
        if (options.smoothingTimeConstant !== undefined) {
          this.#node.smoothingTimeConstant = clamp(
            options.smoothingTimeConstant,
            0,
            1,
          );
        }
        if (options.minDecibels !== undefined) {
          this.#node.minDecibels = options.minDecibels;
        }
        if (options.maxDecibels !== undefined) {
          this.#node.maxDecibels = options.maxDecibels;
        }
      } catch {
        // Browser implementations may reject updates while a context is closed.
      }
    }
    const fftSize = this.#node?.fftSize ?? requestedFftSize;
    this.#fallbackFftSize = fftSize;
    this.#frequencyData = new Uint8Array(Math.max(1, Math.floor(fftSize / 2)));
    this.#timeDomainData = new Uint8Array(Math.max(1, fftSize));
  }

  /** Whether a live analyser node is available. */
  get available(): boolean {
    return this.#node !== null && !this.#disposed;
  }

  /** FFT size in samples, or the requested fallback size without Web Audio. */
  get fftSize(): number {
    return this.#node?.fftSize ?? this.#fallbackFftSize;
  }

  /** Number of frequency bins in the current analyser. */
  get frequencyBinCount(): number {
    return (
      this.#node?.frequencyBinCount ??
      Math.max(1, Math.floor(this.#fallbackFftSize / 2))
    );
  }

  /** Reusable byte array containing the most recent frequency magnitudes. */
  get frequencyData(): Uint8Array {
    return this.#frequencyData;
  }

  /** Reusable byte array containing the most recent time-domain samples. */
  get timeDomainData(): Uint8Array {
    return this.#timeDomainData;
  }

  /** Connects an audio source to this analyser without taking ownership of it. */
  attach(source: AudioNodeLike | AudioNode | null): this {
    if (!(source && this.#node) || this.#disposed) return this;
    try {
      (source as unknown as AudioNodeLike).connect(this.#node);
    } catch {
      // A source can already be disconnected or belong to a closed context.
    }
    return this;
  }

  /** Copies frequency magnitudes into a reusable or caller-owned byte array. */
  getFrequencyData(target: Uint8Array = this.#frequencyData): Uint8Array {
    if (!this.#node || this.#disposed) {
      target.fill(0);
      return target;
    }
    try {
      this.#node.getByteFrequencyData(target);
    } catch {
      target.fill(0);
    }
    return target;
  }

  /** Copies time-domain samples into a reusable or caller-owned byte array. */
  getTimeDomainData(target: Uint8Array = this.#timeDomainData): Uint8Array {
    if (!this.#node || this.#disposed) {
      target.fill(128);
      return target;
    }
    try {
      this.#node.getByteTimeDomainData(target);
    } catch {
      target.fill(128);
    }
    return target;
  }

  /** Returns the mean magnitude of the current frequency data in byte units. */
  get averageFrequency(): number {
    const values = this.getFrequencyData();
    if (values.length === 0) return 0;
    let total = 0;
    for (const value of values) total += value;
    return total / values.length;
  }

  /** Disconnects the analyser node and clears its reusable data buffers. */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    try {
      this.#node?.disconnect?.();
    } catch {
      // Disconnecting a closed context is already complete.
    }
    this.#frequencyData.fill(0);
    this.#timeDomainData.fill(128);
  }
}

function resolveNode(
  source:
    | AudioContextLike
    | AudioContext
    | AnalyserNodeLike
    | AnalyserNode
    | null,
): AnalyserNodeLike | null {
  if (!source) return null;
  if (typeof (source as AudioContextLike).createAnalyser === "function") {
    try {
      return (source as unknown as AudioContextLike).createAnalyser?.() ?? null;
    } catch {
      return null;
    }
  }
  return source as unknown as AnalyserNodeLike;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeFftSize(value: number): number {
  if (!Number.isFinite(value) || value < 32) return 128;
  let size = 32;
  while (size < value && size < 32768) size *= 2;
  return size;
}

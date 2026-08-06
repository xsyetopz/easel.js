/** Minimal audio parameter shape shared by browser nodes and test doubles. */
export interface AudioParamLike {
  /** Current scalar parameter value. */
  value: number;
  /** Schedules a value at an audio-context time. */
  setValueAtTime?: (value: number, time: number) => AudioParamLike;
  /** Schedules a linear ramp to a value. */
  linearRampToValueAtTime?: (value: number, time: number) => AudioParamLike;
}

/** Structural subset of an AudioNode used by EASEL audio utilities. */
export interface AudioNodeLike {
  /** Connects this node to another node or parameter. */
  connect: (destination: AudioNodeLike | AudioParamLike) => unknown;
  /** Disconnects this node from its current destinations. */
  disconnect?: (destination?: AudioNodeLike | AudioParamLike) => void;
}

/** Structural subset of an oscillator node used by CPU/browser examples. */
export interface OscillatorNodeLike extends AudioNodeLike {
  /** Oscillator waveform name. */
  type: string;
  /** Oscillator frequency parameter. */
  frequency: AudioParamLike;
  /** Starts oscillator playback at the supplied context time. */
  start?: (when?: number) => void;
  /** Stops oscillator playback at the supplied context time. */
  stop?: (when?: number) => void;
}

/** Structural subset of a stereo panner node used by orientation examples. */
export interface StereoPannerNodeLike extends AudioNodeLike {
  /** Stereo pan parameter in the range -1 through 1. */
  pan: AudioParamLike;
}

/** Structural subset of an analyser node used for Canvas2D visualizations. */
export interface AnalyserNodeLike extends AudioNodeLike {
  /** FFT size in samples. */
  fftSize: number;
  /** Number of frequency bins exposed by the analyser. */
  readonly frequencyBinCount: number;
  /** Exponential smoothing factor for frequency data. */
  smoothingTimeConstant: number;
  /** Lowest decibel value represented by the analyser. */
  minDecibels: number;
  /** Highest decibel value represented by the analyser. */
  maxDecibels: number;
  /** Copies current frequency magnitudes into a byte array. */
  getByteFrequencyData: (array: Uint8Array) => void;
  /** Copies current time-domain samples into a byte array. */
  getByteTimeDomainData: (array: Uint8Array) => void;
}

/** Structural subset of an AudioContext used by AudioGraph. */
export interface AudioContextLike {
  /** Current audio timeline position in seconds. */
  readonly currentTime: number;
  /** Destination node for the context's output. */
  readonly destination: AudioNodeLike;
  /** Creates a gain node. */
  createGain?: () => AudioNodeLike & { gain: AudioParamLike };
  /** Creates an analyser node. */
  createAnalyser?: () => AnalyserNodeLike;
  /** Creates a media-element source node. */
  createMediaElementSource?: (element: HTMLMediaElement) => AudioNodeLike;
  /** Creates an oscillator node. */
  createOscillator?: () => OscillatorNodeLike;
  /** Creates a stereo panner node. */
  createStereoPanner?: () => StereoPannerNodeLike;
  /** Resumes a suspended context. */
  resume?: () => Promise<void>;
  /** Suspends active audio processing. */
  suspend?: () => Promise<void>;
  /** Closes the context and releases browser audio resources. */
  close?: () => Promise<void>;
}

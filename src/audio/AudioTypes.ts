/** Minimal audio parameter shape shared by browser nodes and test doubles. */
export interface AudioParamLike {
  /** Current scalar parameter value. */
  value: number;
  /** Schedules a value at an audio-context time. */
  setValueAtTime?: (value: number, time: number) => AudioParamLike;
  /** Schedules a linear ramp to a value. */
  linearRampToValueAtTime?: (value: number, time: number) => AudioParamLike;
  /** Schedules an exponential approach toward a target value. */
  setTargetAtTime?: (value: number, time: number, tau: number) => void;
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

/** Structural subset of an AudioBufferSourceNode used by Audio playback. */
export interface AudioBufferSourceNodeLike extends AudioNodeLike {
  /** Audio buffer assigned to this source. */
  buffer?: AudioBufferLike | undefined;
  /** Whether the source loops playback. */
  loop?: boolean;
  /** Loop start position in seconds. */
  loopStart?: number;
  /** Loop end position in seconds. */
  loopEnd?: number;
  /** Detune parameter in cents. */
  detune?: AudioParamLike;
  /** Playback rate parameter. */
  playbackRate?: AudioParamLike;
  /** Ends callback invoked when playback finishes. */
  onended?: (() => void) | undefined;
  /** Starts playback at the given time with offset and duration. */
  start?: (when?: number, offset?: number, duration?: number) => void;
  /** Stops playback at the given time. */
  stop?: (when?: number) => void;
}

/** Structural subset of a PannerNode used by PositionalAudio. */
export interface PannerNodeLike extends AudioNodeLike {
  /** Panning model name. */
  panningModel?: string;
  /** Distance model name. */
  distanceModel?: string;
  /** Reference distance for volume reduction. */
  refDistance?: number;
  /** Rolloff factor for distance attenuation. */
  rolloffFactor?: number;
  /** Maximum distance for the linear distance model. */
  maxDistance?: number;
  /** Inner cone angle in degrees. */
  coneInnerAngle?: number;
  /** Outer cone angle in degrees. */
  coneOuterAngle?: number;
  /** Volume gain outside the directional cone. */
  coneOuterGain?: number;
  /** Position X parameter (Chrome/Firefox path). */
  positionX?: AudioParamLike;
  /** Position Y parameter (Chrome/Firefox path). */
  positionY?: AudioParamLike;
  /** Position Z parameter (Chrome/Firefox path). */
  positionZ?: AudioParamLike;
  /** Orientation X parameter (Chrome/Firefox path). */
  orientationX?: AudioParamLike;
  /** Orientation Y parameter (Chrome/Firefox path). */
  orientationY?: AudioParamLike;
  /** Orientation Z parameter (Chrome/Firefox path). */
  orientationZ?: AudioParamLike;
  /** Sets the panner position (legacy path). */
  setPosition?: (x: number, y: number, z: number) => void;
  /** Sets the panner orientation (legacy path). */
  setOrientation?: (fx: number, fy: number, fz: number) => void;
}

/** Structural subset of an AudioBuffer used for decoded audio data. */
export interface AudioBufferLike {
  /** Number of channels in the buffer. */
  readonly numberOfChannels: number;
  /** Sample rate in Hz. */
  readonly sampleRate: number;
  /** Buffer duration in seconds. */
  readonly duration: number;
  /** Copies channel data into a Float32Array. */
  getChannelData?: (channel: number) => Float32Array;
}

/** Structural subset of a native AudioListener used by AudioListener. */
export interface NativeAudioListenerLike {
  /** Position X parameter (Chrome/Firefox path). */
  positionX?: AudioParamLike;
  /** Position Y parameter (Chrome/Firefox path). */
  positionY?: AudioParamLike;
  /** Position Z parameter (Chrome/Firefox path). */
  positionZ?: AudioParamLike;
  /** Forward X parameter (Chrome/Firefox path). */
  forwardX?: AudioParamLike;
  /** Forward Y parameter (Chrome/Firefox path). */
  forwardY?: AudioParamLike;
  /** Forward Z parameter (Chrome/Firefox path). */
  forwardZ?: AudioParamLike;
  /** Up X parameter (Chrome/Firefox path). */
  upX?: AudioParamLike;
  /** Up Y parameter (Chrome/Firefox path). */
  upY?: AudioParamLike;
  /** Up Z parameter (Chrome/Firefox path). */
  upZ?: AudioParamLike;
  /** Sets the listener position (legacy path). */
  setPosition?: (x: number, y: number, z: number) => void;
  /** Sets the listener orientation (legacy path). */
  setOrientation?: (
    fx: number,
    fy: number,
    fz: number,
    ux: number,
    uy: number,
    uz: number,
  ) => void;
}

/** Structural subset of an AudioContext used by AudioGraph. */
export interface AudioContextLike {
  /** Current audio timeline position in seconds. */
  readonly currentTime: number;
  /** Destination node for the context's output. */
  readonly destination: AudioNodeLike;
  /** Native audio listener for spatial positioning. */
  readonly listener?: NativeAudioListenerLike;
  /** Creates a gain node. */
  createGain?: () => AudioNodeLike & { gain: AudioParamLike };
  /** Creates an analyser node. */
  createAnalyser?: () => AnalyserNodeLike;
  /** Creates a media-element source node. */
  createMediaElementSource?: (element: HTMLMediaElement) => AudioNodeLike;
  /** Creates a media-stream source node. */
  createMediaStreamSource?: (stream: MediaStream) => AudioNodeLike;
  /** Creates an oscillator node. */
  createOscillator?: () => OscillatorNodeLike;
  /** Creates a stereo panner node. */
  createStereoPanner?: () => StereoPannerNodeLike;
  /** Creates a buffer source node for AudioBuffer playback. */
  createBufferSource?: () => AudioBufferSourceNodeLike;
  /** Creates a panner node for 3D positional audio. */
  createPanner?: () => PannerNodeLike;
  /** Decodes an ArrayBuffer into an AudioBuffer. */
  decodeAudioData?: (
    arrayBuffer: ArrayBuffer,
    successCallback?: (buffer: AudioBufferLike) => void,
    errorCallback?: (error: unknown) => void,
  ) => Promise<AudioBufferLike>;
  /** Resumes a suspended context. */
  resume?: () => Promise<void>;
  /** Suspends active audio processing. */
  suspend?: () => Promise<void>;
  /** Closes the context and releases browser audio resources. */
  close?: () => Promise<void>;
}

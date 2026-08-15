import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  PannerNodeLike,
} from "@/index.ts";
import {
  Audio,
  AudioListener,
  getAudioContext,
  PositionalAudio,
  setAudioContext,
} from "@/index.ts";

afterEach(() => setAudioContext(undefined));

function param(value = 0): AudioParamLike {
  return {
    value,
    setValueAtTime(next: number): AudioParamLike {
      this.value = next;
      return this;
    },
    setTargetAtTime(next: number): void {
      this.value = next;
    },
    linearRampToValueAtTime(next: number): AudioParamLike {
      this.value = next;
      return this;
    },
  };
}

function node(): AudioNodeLike & {
  connections: AudioNodeLike[];
} {
  return {
    connections: [],
    connect(
      destination: AudioNodeLike | AudioParamLike,
    ): AudioNodeLike | AudioParamLike {
      if ("connections" in destination) {
        (
          destination as AudioNodeLike & { connections: AudioNodeLike[] }
        ).connections.push(this);
      }
      return destination;
    },
    disconnect(destination?: AudioNodeLike | AudioParamLike): void {
      if (destination && "connections" in destination) {
        (
          destination as AudioNodeLike & { connections: AudioNodeLike[] }
        ).connections.length = 0;
      }
    },
  };
}

function gainNode(): AudioNodeLike & {
  gain: AudioParamLike;
  connections: AudioNodeLike[];
} {
  return { ...node(), gain: param(1) };
}

function bufferSource(): AudioBufferSourceNodeLike {
  return {
    ...node(),
    buffer: undefined,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    detune: param(0),
    playbackRate: param(1),
    onended: undefined,
    start: mock((): void => undefined),
    stop: mock((): void => undefined),
  };
}

function panner(): PannerNodeLike {
  return {
    ...node(),
    panningModel: "equalpower",
    distanceModel: "inverse",
    refDistance: 1,
    rolloffFactor: 1,
    maxDistance: 10000,
    coneInnerAngle: 360,
    coneOuterAngle: 0,
    coneOuterGain: 0,
    positionX: param(0),
    positionY: param(0),
    positionZ: param(0),
    orientationX: param(0),
    orientationY: param(0),
    orientationZ: param(0),
    setPosition: mock((): void => undefined),
    setOrientation: mock((): void => undefined),
  };
}

function audioBuffer(duration = 2): AudioBufferLike {
  return {
    numberOfChannels: 2,
    sampleRate: 44100,
    duration,
    getChannelData: (): Float32Array => new Float32Array(100),
  };
}

function makeContext(): AudioContextLike & {
  createBufferSource: () => AudioBufferSourceNodeLike;
  createPanner: () => PannerNodeLike;
} {
  const destination = node();
  const gain = gainNode();
  const listener = {
    positionX: param(0),
    positionY: param(0),
    positionZ: param(0),
    forwardX: param(0),
    forwardY: param(0),
    forwardZ: param(-1),
    upX: param(0),
    upY: param(1),
    upZ: param(0),
  };
  return {
    currentTime: 0,
    destination,
    listener,
    createGain: () => gain,
    createBufferSource: () => bufferSource(),
    createPanner: () => panner(),
  } as AudioContextLike & {
    createBufferSource: () => AudioBufferSourceNodeLike;
    createPanner: () => PannerNodeLike;
  };
}

function setupContext(): [AudioContextLike, AudioListener] {
  const context = makeContext();
  setAudioContext(context);
  return [context, new AudioListener()];
}

describe("AudioContext functions", () => {
  test("setAudioContext and getAudioContext round-trip", () => {
    const original = getAudioContext();
    const ctx = makeContext();
    setAudioContext(ctx);
    expect(getAudioContext()).toBe(ctx);
    setAudioContext(original);
  });
});

describe("AudioListener", () => {
  test("constructs with context and gain node", () => {
    const [ctx, listener] = setupContext();
    expect(listener.context).toBe(ctx);
    expect(listener.gain).toBeDefined();
    expect(listener.input).toBe(listener.gain);
  });

  test("masterVolume accessor updates gain", () => {
    const [, listener] = setupContext();
    listener.masterVolume = 0.5;
    expect(listener.masterVolume).toBe(0.5);
  });

  test("handles undefined context gracefully", () => {
    const listener = new AudioListener();
    expect(listener.context).toBeUndefined();
    expect(listener.gain).toBeUndefined();
    expect(listener.masterVolume).toBe(0);
  });
});

describe("Audio", () => {
  test("constructs bound to listener", () => {
    const [ctx, listener] = setupContext();
    const audio = new Audio(listener);
    expect(audio.listener).toBe(listener);
    expect(audio.context).toBe(ctx);
    expect(audio.isPlaying).toBe(false);
    expect(audio.sourceType).toBe("empty");
  });

  test("setBuffer and play/pause/stop cycle", () => {
    const [, listener] = setupContext();
    const audio = new Audio(listener);
    const buf = audioBuffer(3);
    audio.setBuffer(buf);
    expect(audio.sourceType).toBe("buffer");

    audio.play();
    expect(audio.isPlaying).toBe(true);

    audio.pause();
    expect(audio.isPlaying).toBe(false);

    audio.play();
    audio.stop();
    expect(audio.isPlaying).toBe(false);
  });

  test("volume accessor updates gain", () => {
    const [, listener] = setupContext();
    const audio = new Audio(listener);
    audio.volume = 0.3;
    expect(audio.volume).toBe(0.3);
  });
});

describe("Audio playback", () => {
  test("applyLoop sets the loop flag", () => {
    const [, listener] = setupContext();
    const audio = new Audio(listener);
    audio.applyLoop(true);
    expect(audio.loop).toBe(true);
    audio.applyLoop(false);
    expect(audio.loop).toBe(false);
  });

  test("applyPlaybackRate updates playbackRate", () => {
    const [, listener] = setupContext();
    const audio = new Audio(listener);
    audio.applyPlaybackRate(2);
    expect(audio.playbackRate).toBe(2);
  });

  test("warns when playing with no playback control", () => {
    const [, listener] = setupContext();
    const audio = new Audio(listener);
    audio.hasPlaybackControl = false;
    const spy = spyOn(console, "warn").mockImplementation(() => undefined);
    audio.play();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  test("clone creates a copy bound to same listener", () => {
    const [, listener] = setupContext();
    const audio = new Audio(listener);
    audio.setBuffer(audioBuffer(2));
    audio.applyLoop(true);
    audio.volume = 0.5;
    const cloned = audio.clone();
    expect(cloned.listener).toBe(listener);
    expect(cloned.loop).toBe(true);
    expect(cloned.buffer).toBe(audio.buffer);
  });
});

describe("PositionalAudio", () => {
  test("constructs with a panner node", () => {
    const [, listener] = setupContext();
    const pAudio = new PositionalAudio(listener);
    expect(pAudio.panner).toBeDefined();
    expect(pAudio.panner?.panningModel).toBe("HRTF");
  });

  test("refDistance accessor", () => {
    const [, listener] = setupContext();
    const pAudio = new PositionalAudio(listener);
    pAudio.refDistance = 20;
    expect(pAudio.refDistance).toBe(20);
  });

  test("rolloffFactor accessor", () => {
    const [, listener] = setupContext();
    const pAudio = new PositionalAudio(listener);
    pAudio.rolloffFactor = 0.5;
    expect(pAudio.rolloffFactor).toBe(0.5);
  });

  test("setDirectionalCone", () => {
    const [, listener] = setupContext();
    const pAudio = new PositionalAudio(listener);
    pAudio.setDirectionalCone(45, 120, 0.3);
    expect(pAudio.panner?.coneInnerAngle).toBe(45);
    expect(pAudio.panner?.coneOuterAngle).toBe(120);
    expect(pAudio.panner?.coneOuterGain).toBe(0.3);
  });

  test("updateMatrixWorld updates panner position", () => {
    const [, listener] = setupContext();
    const pAudio = new PositionalAudio(listener);
    pAudio.setBuffer(audioBuffer(1));
    pAudio.play();
    pAudio.position.set(5, 0, 0);
    pAudio.updateMatrixWorld();
    // Should not throw; panner positionX should have been set
    expect(pAudio.panner?.positionX?.value).toBeDefined();
  });
});

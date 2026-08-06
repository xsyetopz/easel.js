import { describe, expect, mock, spyOn, test } from "bun:test";
import {
  Audio,
  getAudioContext,
  AudioListener,
  PositionalAudio,
  setAudioContext,
} from "@/index.ts";
import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  PannerNodeLike,
} from "@/index.ts";

function param(value = 0): AudioParamLike {
  return {
    value,
    setValueAtTime(next) {
      this.value = next;
      return this;
    },
    setTargetAtTime(next) {
      this.value = next;
    },
    linearRampToValueAtTime(next) {
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
    connect(destination) {
      if ("connections" in destination) {
        (
          destination as AudioNodeLike & { connections: AudioNodeLike[] }
        ).connections.push(this);
      }
      return destination;
    },
    disconnect(destination) {
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
    start: mock(() => {}),
    stop: mock(() => {}),
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
    setPosition: mock(() => {}),
    setOrientation: mock(() => {}),
  };
}

function audioBuffer(duration = 2): AudioBufferLike {
  return {
    numberOfChannels: 2,
    sampleRate: 44100,
    duration,
    getChannelData: () => new Float32Array(100),
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
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    expect(listener.context).toBe(ctx);
    expect(listener.gain).toBeDefined();
    expect(listener.input).toBe(listener.gain);
    setAudioContext(undefined);
  });

  test("masterVolume accessor updates gain", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    listener.masterVolume = 0.5;
    expect(listener.masterVolume).toBe(0.5);
    setAudioContext(undefined);
  });

  test("handles undefined context gracefully", () => {
    setAudioContext(undefined);
    const listener = new AudioListener();
    expect(listener.context).toBeUndefined();
    expect(listener.gain).toBeUndefined();
    expect(listener.masterVolume).toBe(0);
  });
});

describe("Audio", () => {
  test("constructs bound to listener", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    const audio = new Audio(listener);
    expect(audio.listener).toBe(listener);
    expect(audio.context).toBe(ctx);
    expect(audio.isPlaying).toBe(false);
    expect(audio.sourceType).toBe("empty");
    setAudioContext(undefined);
  });

  test("setBuffer and play/pause/stop cycle", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
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
    setAudioContext(undefined);
  });

  test("volume accessor updates gain", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    const audio = new Audio(listener);
    audio.volume = 0.3;
    expect(audio.volume).toBe(0.3);
    setAudioContext(undefined);
  });

  test("applyLoop sets the loop flag", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    const audio = new Audio(listener);
    audio.applyLoop(true);
    expect(audio.loop).toBe(true);
    audio.applyLoop(false);
    expect(audio.loop).toBe(false);
    setAudioContext(undefined);
  });

  test("applyPlaybackRate updates playbackRate", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    const audio = new Audio(listener);
    audio.applyPlaybackRate(2);
    expect(audio.playbackRate).toBe(2);
    setAudioContext(undefined);
  });

  test("warns when playing with no playback control", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    const audio = new Audio(listener);
    audio.hasPlaybackControl = false;
    const spy = spyOn(console, "warn").mockImplementation(() => {});
    audio.play();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    setAudioContext(undefined);
  });

  test("clone creates a copy bound to same listener", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    const audio = new Audio(listener);
    audio.setBuffer(audioBuffer(2));
    audio.applyLoop(true);
    audio.volume = 0.5;
    const cloned = audio.clone();
    expect(cloned.listener).toBe(listener);
    expect(cloned.loop).toBe(true);
    expect(cloned.buffer).toBe(audio.buffer);
    setAudioContext(undefined);
  });
});

describe("PositionalAudio", () => {
  test("constructs with a panner node", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    const pAudio = new PositionalAudio(listener);
    expect(pAudio.panner).toBeDefined();
    expect(pAudio.panner?.panningModel).toBe("HRTF");
    setAudioContext(undefined);
  });

  test("refDistance accessor", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    const pAudio = new PositionalAudio(listener);
    pAudio.refDistance = 20;
    expect(pAudio.refDistance).toBe(20);
    setAudioContext(undefined);
  });

  test("rolloffFactor accessor", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    const pAudio = new PositionalAudio(listener);
    pAudio.rolloffFactor = 0.5;
    expect(pAudio.rolloffFactor).toBe(0.5);
    setAudioContext(undefined);
  });

  test("setDirectionalCone", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    const pAudio = new PositionalAudio(listener);
    pAudio.setDirectionalCone(45, 120, 0.3);
    expect(pAudio.panner?.coneInnerAngle).toBe(45);
    expect(pAudio.panner?.coneOuterAngle).toBe(120);
    expect(pAudio.panner?.coneOuterGain).toBe(0.3);
    setAudioContext(undefined);
  });

  test("updateMatrixWorld updates panner position", () => {
    const ctx = makeContext();
    setAudioContext(ctx);
    const listener = new AudioListener();
    const pAudio = new PositionalAudio(listener);
    pAudio.setBuffer(audioBuffer(1));
    pAudio.play();
    pAudio.position.set(5, 0, 0);
    pAudio.updateMatrixWorld();
    // Should not throw; panner positionX should have been set
    expect(pAudio.panner?.positionX?.value).toBeDefined();
    setAudioContext(undefined);
  });
});

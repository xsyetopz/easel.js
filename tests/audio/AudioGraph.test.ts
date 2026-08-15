import { describe, expect, test } from "bun:test";
import {
  type AnalyserNodeLike,
  AudioAnalyzer,
  type AudioContextLike,
  AudioGraph,
  type AudioNodeLike,
  type AudioParamLike,
  type OscillatorNodeLike,
} from "@/index.ts";

function parameter(value = 0): AudioParamLike {
  return {
    value,
    setValueAtTime(next: number): AudioParamLike {
      this.value = next;
      return this;
    },
  };
}

function node(): AudioNodeLike & { connections: AudioNodeLike[] } {
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
    disconnect(): void {
      this.connections.length = 0;
    },
  };
}

function context(): {
  context: AudioContextLike;
  analyser: AnalyserNodeLike;
  oscillator: OscillatorNodeLike;
  destination: AudioNodeLike & { connections: AudioNodeLike[] };
  state: { resumed: boolean; closed: boolean };
} {
  const destination = node();
  const analyser: AnalyserNodeLike = {
    ...node(),
    fftSize: 128,
    frequencyBinCount: 64,
    smoothingTimeConstant: 0,
    minDecibels: -100,
    maxDecibels: -30,
    getByteFrequencyData(array: Uint8Array): void {
      array.fill(64);
    },
    getByteTimeDomainData(array: Uint8Array): void {
      array.fill(128);
    },
  };
  const oscillator: OscillatorNodeLike = {
    ...node(),
    type: "sine",
    frequency: parameter(440),
    start(): void {
      // The test double does not produce audio.
    },
    stop(): void {
      // The test double does not produce audio.
    },
  };
  const state = { resumed: false, closed: false };
  const audioContext: AudioContextLike = {
    currentTime: 1,
    destination,
    createGain(): AudioNodeLike & { gain: AudioParamLike } {
      return { ...node(), gain: parameter(1) };
    },
    createAnalyser(): AnalyserNodeLike {
      return analyser;
    },
    createOscillator(): OscillatorNodeLike {
      return oscillator;
    },
    resume(): Promise<void> {
      state.resumed = true;
      return Promise.resolve();
    },
    close(): Promise<void> {
      state.closed = true;
      return Promise.resolve();
    },
  };
  return { context: audioContext, analyser, oscillator, destination, state };
}

describe("AudioGraph", () => {
  test("routes sources, reads analyser data, and disposes owned resources", async () => {
    const mock = context();
    const graph = new AudioGraph({ context: mock.context });
    const oscillator = graph.createOscillator();
    expect(oscillator).toBe(mock.oscillator);
    expect(graph.connect(oscillator)).toBe(oscillator);
    const analyzer = graph.createAnalyzer(oscillator, { fftSize: 64 });
    expect(analyzer.available).toBe(true);
    expect(analyzer.averageFrequency).toBe(64);
    expect(analyzer.getTimeDomainData()[0]).toBe(128);
    expect(await graph.resume()).toBe(true);
    expect(mock.state.resumed).toBe(true);
    graph.dispose();
    expect(analyzer.available).toBe(false);
    expect(await graph.resume()).toBe(false);
    expect(mock.state.closed).toBe(false);
  });

  test("degrades to a no-audio graph when no context is injected", () => {
    const graph = new AudioGraph({ context: null });
    const analyzer = graph.createAnalyzer();
    expect(graph.available).toBe(false);
    expect(graph.createOscillator()).toBeNull();
    expect(analyzer.averageFrequency).toBe(0);
    expect(analyzer.getTimeDomainData()[0]).toBe(128);
    graph.dispose();
  });

  test("AudioAnalyzer accepts an existing analyser node", () => {
    const mock = context();
    const analyzer = new AudioAnalyzer(mock.analyser, { fftSize: 128 });
    expect(analyzer.frequencyBinCount).toBe(64);
    expect(analyzer.getFrequencyData().every((value) => value === 64)).toBe(
      true,
    );
    analyzer.dispose();
  });
});

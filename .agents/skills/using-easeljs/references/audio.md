# Audio

EASEL 0.7.0 exposes two complementary browser Web Audio paths:

- `AudioGraph` for lifecycle-safe synthesis, media routing, analyzers, and
  Canvas2D visualization.
- `AudioListener` + `Audio`/`PositionalAudio` for scene-graph audio. `AudioLoader`
  decodes buffers through the global context managed by `getAudioContext` and
  `setAudioContext`.

Neither path renders sound through the CPU rasterizer. Browser autoplay and
user-gesture rules still apply.

## AudioGraph and visualization

```ts
const graph = new EASEL.AudioGraph({ masterVolume: 0.5 });
await graph.resume(); // call from a user gesture

const analyzer = graph.createAnalyzer(undefined, {
  fftSize: 1024,
  smoothingTimeConstant: 0.8,
});
const context = overlay.getContext("2d");
if (!context) throw new Error("Missing Canvas2D context");

function draw(): void {
  EASEL.drawAudioAnalyzer(context, analyzer, "frequency", {
    foreground: "#8cf",
    bars: 48,
  });
  requestAnimationFrame(draw);
}
```

Useful `AudioGraph` methods are `connect`, `createMediaElementSource`,
`createOscillator`, `createStereoPanner`, `createAnalyzer`, `playTone`,
`resume`, `suspend`, `setMasterVolume`, and `dispose`. Check `graph.available`
because non-browser or blocked hosts can produce a no-audio graph.

Visualizers are standalone functions, not a `CanvasAudioVisualizer` class:

```ts
EASEL.drawFrequencyBars(context, analyzer.getFrequencyData(), options);
EASEL.drawTimeDomainWaveform(context, analyzer.getTimeDomainData(), options);
EASEL.drawAudioAnalyzer(context, analyzer, "time", options);
```

Call `analyzer.dispose()` and `graph.dispose()`. A graph closes only an audio
context it created itself; injected contexts remain caller-owned.

## Scene-graph audio

```ts
const listener = new EASEL.AudioListener();
camera.add(listener);

const sound = new EASEL.PositionalAudio(listener);
scene.add(sound);

const loader = new EASEL.AudioLoader();
loader.load(
  "/audio/effect.ogg",
  (buffer) => {
    sound.setBuffer(buffer);
    sound.refDistance = 2;
    sound.volume = 0.7;
    sound.play();
  },
  undefined,
  (error) => console.error(error),
);
```

`Audio` provides buffer/media/node sources, playback control, filters, loop,
rate, detune, and volume. `PositionalAudio` adds panner distance, cone, and
world-transform behavior. The listener is normally parented to the camera and
its world transform must be updated with the scene/camera preparation lifecycle.

`AudioGraphOptions.context` and `AudioAnalyzer` intentionally accept `null` to
represent unavailable Web Audio. This is a browser/audio boundary, not a scene
absence convention.

import {
  AudioGraph,
  drawFrequencyBars,
  drawTimeDomainWaveform,
} from "@/index.js";

export const meta = {
  id: "webaudio_visualizer",
  name: "WebAudio Visualizer",
  category: "webaudio",
  description:
    "A CPU Canvas2D visualizer draws analyser frequency bars and a time-domain waveform.",
};

export const controls = [];

export function setup(canvas) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const graph = new AudioGraph();
  const oscillator = graph.createOscillator();
  if (oscillator) {
    oscillator.type = "sawtooth";
    oscillator.frequency.value = 128;
    graph.connect(oscillator);
    oscillator.start?.();
  }
  const analyzer = graph.createAnalyzer(oscillator, { fftSize: 128 });
  void graph.resume();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    const width = canvas.width;
    const height = canvas.height;
    const barsHeight = Math.floor(height * 0.62);
    context.clearRect(0, 0, width, height);
    drawFrequencyBars(context, analyzer.getFrequencyData(), {
      x: 0,
      y: 0,
      width,
      height: barsHeight,
      background: "#202020",
      foreground: "#ffe600",
      bars: 64,
      gap: 1,
    });
    drawTimeDomainWaveform(context, analyzer.getTimeDomainData(), {
      x: 0,
      y: barsHeight,
      width,
      height: height - barsHeight,
      background: "#202020",
      foreground: "#59c5d6",
      lineWidth: 2,
    });
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      oscillator?.stop?.();
      graph.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const graph = new EASEL.AudioGraph();
const oscillator = graph.createOscillator();
const analyzer = graph.createAnalyzer(oscillator, { fftSize: 128 });
graph.connect(oscillator);
oscillator?.start();
EASEL.drawFrequencyBars(context, analyzer.getFrequencyData());
EASEL.drawTimeDomainWaveform(context, analyzer.getTimeDomainData());`;

export const threeSource = `import * as THREE from "three";

const analyser = new THREE.AudioAnalyser(audio, 128);
const texture = new THREE.DataTexture(analyser.data, 64, 1, THREE.RedFormat);
analyser.getFrequencyData();
texture.needsUpdate = true;`;

export const example = { meta, controls, setup, easelSource, threeSource };

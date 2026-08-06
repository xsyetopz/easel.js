import { AudioGraph, drawFrequencyBars } from "@/index.js";

export const meta = {
  id: "webaudio_sandbox",
  name: "WebAudio Sandbox",
  category: "webaudio",
  description:
    "Three CPU-rendered sound sources expose independent analyser levels and a generated tone.",
};

export const controls = [];

export function setup(canvas) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const graph = new AudioGraph();
  const frequencies = [110, 220, 330];
  const colors = ["#ffaa00", "#ff2200", "#6622aa"];
  const analyzers = [];
  const oscillators = frequencies.map((frequency, index) => {
    const oscillator = graph.createOscillator();
    if (!oscillator) return null;
    oscillator.type = index === 2 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    graph.connect(oscillator);
    analyzers.push(graph.createAnalyzer(oscillator, { fftSize: 32 }));
    oscillator.start?.();
    return oscillator;
  });
  void graph.resume();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    const width = canvas.width;
    const height = canvas.height;
    context.fillStyle = "#090b10";
    context.fillRect(0, 0, width, height);
    const section = width / 3;
    analyzers.forEach((analyzer, index) => {
      const x = section * index;
      const average = analyzer.averageFrequency / 255;
      context.fillStyle = colors[index];
      context.beginPath();
      context.arc(
        x + section * 0.5,
        height * 0.32,
        34 + average * 46,
        0,
        Math.PI * 2,
      );
      context.fill();
      drawFrequencyBars(context, analyzer.getFrequencyData(), {
        x,
        y: height * 0.62,
        width: section,
        height: height * 0.38,
        foreground: colors[index],
        bars: 8,
        gap: 2,
      });
    });
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      for (const oscillator of oscillators) oscillator?.stop?.();
      graph.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const graph = new EASEL.AudioGraph();
const oscillator = graph.createOscillator();
const analyzer = graph.createAnalyzer(oscillator, { fftSize: 32 });
graph.connect(oscillator);
oscillator?.start();
const values = analyzer.getFrequencyData();`;

export const threeSource = `import * as THREE from "three";

const sound = new THREE.PositionalAudio(listener);
sound.setMediaElementSource(audioElement);
mesh.add(sound);
const analyser = new THREE.AudioAnalyser(sound, 32);
const values = analyser.getFrequencyData();`;

export const example = { meta, controls, setup, easelSource, threeSource };

import { AudioGraph, drawAudioAnalyzer } from "@/index.js";

export const meta = {
  id: "webaudio_orientation",
  name: "WebAudio Orientation",
  category: "webaudio",
  description:
    "A Canvas2D positional-audio scene follows a moving stereo source without a GPU renderer.",
};

export const controls = [];

export function setup(canvas) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const graph = new AudioGraph();
  const oscillator = graph.createOscillator();
  const panner = graph.createStereoPanner();
  const analyzer = graph.createAnalyzer(oscillator, { fftSize: 64 });
  if (oscillator) {
    oscillator.type = "sine";
    oscillator.frequency.value = 220;
    if (panner) oscillator.connect(panner);
    else graph.connect(oscillator);
    oscillator.start?.();
  }
  void graph.resume();
  let frame;
  function animate(time = 0) {
    frame = globalThis.requestAnimationFrame(animate);
    const width = canvas.width;
    const height = canvas.height;
    const x = width * (0.5 + Math.sin(time * 0.001) * 0.35);
    const pan = Math.max(-1, Math.min(1, (x / width) * 2 - 1));
    if (panner) panner.pan.value = pan;
    context.fillStyle = "#101722";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#2e4058";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(width * 0.5, height * 0.18);
    context.lineTo(width * 0.5, height * 0.82);
    context.stroke();
    context.fillStyle = "#59c5d6";
    context.beginPath();
    context.arc?.(x, height * 0.5, 24, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#d5e7f2";
    context.font = "14px sans-serif";
    context.fillText?.("left", 12, height - 16);
    context.fillText?.("right", width - 44, height - 16);
    drawAudioAnalyzer(context, analyzer, "frequency", {
      x: 0,
      y: height * 0.72,
      width,
      height: height * 0.28,
      foreground: "#ffe600",
      background: "rgba(16,23,34,0.35)",
      bars: 16,
      gap: 2,
    });
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      graph.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const graph = new EASEL.AudioGraph();
const oscillator = graph.createOscillator();
const panner = graph.createStereoPanner();
if (oscillator && panner) oscillator.connect(panner);
const analyzer = graph.createAnalyzer(oscillator);
oscillator?.start();`;

export const threeSource = `import * as THREE from "three";
import { PositionalAudioHelper } from "three/addons/helpers/PositionalAudioHelper.js";

const listener = new THREE.AudioListener();
const positionalAudio = new THREE.PositionalAudio(listener);
positionalAudio.setMediaElementSource(audioElement);
positionalAudio.setRefDistance(1);
positionalAudio.setDirectionalCone(180, 230, 0.1);
mesh.add(positionalAudio);
mesh.add(new PositionalAudioHelper(positionalAudio, 0.1));`;

export const example = { meta, controls, setup, easelSource, threeSource };

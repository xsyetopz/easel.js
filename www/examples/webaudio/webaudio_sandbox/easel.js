import {
  Audio,
  AudioAnalyzer,
  AudioListener,
  DirectionalLight,
  FirstPersonControls,
  FogExp2,
  GridHelper,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PositionalAudio,
  Renderer,
  Scene,
  Shading,
  SphereGeometry,
  setAudioContext,
  Timer,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import {
  createPulseTrack,
  SKULLBEATZ_TRACK,
  SONG_TRACK,
  UTOPIA_TRACK,
} from "./generated-audio.js";

export const meta = {
  id: "webaudio_sandbox",
  upstream: "webaudio_sandbox",
  name: "sandbox",
  category: "webaudio",
  animated: true,
  description:
    "Three flat-shaded spheres carry positional sound sources over a grid; click to start the audio, then walk with WASD and drag to look while each sphere glows with its sound's loudness.",
  differences: [
    "Both sides start with the scene already rendered and build the audio graph on the first click on their own canvas, instead of waiting for the upstream START button; cleanup stops every source and closes that side's AudioContext.",
    "The upstream music tracks 358232 and 376737 are CC BY-NC-SA and are not copied, so both sides substitute generated audio: a sawtooth pulsing twice a second on the first sphere and a fast square beat on the second, built from OscillatorNode and GainNode.",
    "The CC0 Project_Utopia ambience is also replaced by a generated slow triangle swell, because the asset was not copied into this repository; it plays as a node source instead of a looping media element.",
    "The generated sources start at once and never end, where the two upstream songs play through once.",
    "EASEL has no Phong material, so the spheres use flat-shaded LambertMaterial without specular.",
    "EASEL's AudioAnalyzer takes an AudioContext and options, so the port creates one per sphere with fftSize 32 and attaches it to that sound's output, where three.js passes the sound to AudioAnalyser.",
    "EASEL FogExp2 evaluates fog per vertex from a lookup table, so the fog fades across each face instead of per pixel.",
  ],
};

/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "slider",
    key: "master",
    label: "master",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
  },
  {
    type: "slider",
    key: "firstSphere",
    label: "firstSphere",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
  },
  {
    type: "slider",
    key: "secondSphere",
    label: "secondSphere",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
  },
  {
    type: "slider",
    key: "thirdSphere",
    label: "thirdSphere",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    type: "slider",
    key: "Ambient",
    label: "Ambient",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    type: "slider",
    key: "frequency",
    label: "frequency",
    min: 50,
    max: 5000,
    step: 1,
    default: 144,
  },
  {
    type: "select",
    key: "wavetype",
    label: "wavetype",
    options: ["sine", "square", "sawtooth", "triangle"],
    default: "sine",
  },
];

export function setup(canvas, params) {
  let settings = { ...params };
  let audio;

  const timer = new Timer();
  if (canvas.ownerDocument) timer.connect(canvas.ownerDocument);

  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 10000,
  });
  camera.position.set(0, 25, 0);

  const scene = new Scene();
  scene.fog = new FogExp2(0x000000, 0.0025);

  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(0, 0.5, 1).normalize();
  scene.add(light);

  const sphere = new SphereGeometry(20, 32, 16);

  const material1 = new LambertMaterial({
    color: 0xffaa00,
    shading: Shading.Flat,
    vertexColors: false,
  });
  const material2 = new LambertMaterial({
    color: 0xff2200,
    shading: Shading.Flat,
    vertexColors: false,
  });
  const material3 = new LambertMaterial({
    color: 0x6622aa,
    shading: Shading.Flat,
    vertexColors: false,
  });

  // sound spheres

  const mesh1 = new Mesh(sphere, material1);
  mesh1.position.set(-250, 30, 0);
  scene.add(mesh1);

  const mesh2 = new Mesh(sphere, material2);
  mesh2.position.set(250, 30, 0);
  scene.add(mesh2);

  const mesh3 = new Mesh(sphere, material3);
  mesh3.position.set(0, 30, -250);
  scene.add(mesh3);

  // ground

  const helper = new GridHelper(1000, 10, 0x444444, 0x444444);
  helper.position.y = 0.1;
  scene.add(helper);

  // The upstream start button becomes the first click on the canvas: the
  // scene renders at once, and audio starts only after that user gesture.
  function startAudio() {
    if (audio || typeof globalThis.AudioContext !== "function") return;

    // A fresh context per mount, because cleanup closes it.
    const context = new globalThis.AudioContext();
    setAudioContext(context);

    const listener = new AudioListener();
    camera.add(listener);

    const track1 = createPulseTrack(context, SONG_TRACK);
    const sound1 = new PositionalAudio(listener);
    sound1.setNodeSource(track1.output);
    sound1.refDistance = 20;
    mesh1.add(sound1);

    //

    const track2 = createPulseTrack(context, SKULLBEATZ_TRACK);
    const sound2 = new PositionalAudio(listener);
    sound2.setNodeSource(track2.output);
    sound2.refDistance = 20;
    mesh2.add(sound2);

    //

    const sound3 = new PositionalAudio(listener);
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(144, context.currentTime);
    oscillator.start(0);
    sound3.setNodeSource(oscillator);
    sound3.refDistance = 20;
    sound3.volume = 0.5;
    mesh3.add(sound3);

    // analysers

    const analysers = [sound1, sound2, sound3].map((sound) =>
      new AudioAnalyzer(context, { fftSize: 32 }).attach(sound.output),
    );

    // global ambient audio

    const track4 = createPulseTrack(context, UTOPIA_TRACK);
    const sound4 = new Audio(listener);
    sound4.setNodeSource(track4.output);
    sound4.volume = 0.5;

    audio = {
      context,
      listener,
      sounds: [sound1, sound2, sound3, sound4],
      tracks: [track1, track2, track4],
      oscillator,
      analysers,
    };
    applySettings();
  }
  canvas.addEventListener("click", startAudio);

  function applySettings() {
    if (!audio) return;
    const { listener, sounds, oscillator, context } = audio;
    listener.masterVolume = Number(settings.master);
    sounds[0].volume = Number(settings.firstSphere);
    sounds[1].volume = Number(settings.secondSphere);
    sounds[2].volume = Number(settings.thirdSphere);
    sounds[3].volume = Number(settings.Ambient);
    oscillator.frequency.setValueAtTime(
      Number(settings.frequency),
      context.currentTime,
    );
    oscillator.type = settings.wavetype;
  }

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  const fpControls = new FirstPersonControls(camera, canvas);

  fpControls.movementSpeed = 70;
  fpControls.lookSpeed = 0.2;
  fpControls.lookVertical = false;

  const materials = [material1, material2, material3];

  const animation = createExampleAnimationLoop((timestamp) => {
    timer.update(timestamp);

    const delta = timer.delta;

    fpControls.update(delta);

    if (audio) {
      for (let i = 0; i < 3; i++) {
        materials[i].emissive.b = audio.analysers[i].averageFrequency / 256;
      }
    }

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    update(next) {
      settings = { ...next };
      applySettings();
    },
    cleanup() {
      animation.cleanup();
      canvas.removeEventListener("click", startAudio);
      if (audio) {
        for (const track of audio.tracks) track.stop();
        audio.oscillator.stop();
        for (const analyser of audio.analysers) analyser.dispose();
        // Closing the context releases every remaining node.
        audio.context.close();
        setAudioContext(undefined);
        audio = undefined;
      }
      timer.dispose();
      fpControls.dispose();
      sphere.dispose();
      for (const material of materials) material.dispose();
      helper.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

canvas.addEventListener("click", () => {
  const context = new AudioContext();
  EASEL.setAudioContext(context);

  const listener = new EASEL.AudioListener();
  camera.add(listener);

  const sound = new EASEL.PositionalAudio(listener);
  const oscillator = context.createOscillator();
  oscillator.start(0);
  sound.setNodeSource(oscillator);
  sound.refDistance = 20;
  sound.volume = 0.5;
  mesh.add(sound);

  analyser = new EASEL.AudioAnalyzer(context, { fftSize: 32 }).attach(sound.output);
});

material.emissive.b = analyser.averageFrequency / 256;
controls.update(timer.update(timestamp).delta);
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };

// Adapted from three.js r186 examples/webaudio_sandbox.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { FirstPersonControls } from "three/addons/controls/FirstPersonControls.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import {
  createPulseTrack,
  SKULLBEATZ_TRACK,
  SONG_TRACK,
  UTOPIA_TRACK,
} from "./generated-audio.js";

export function setup(canvas, params) {
  let settings = { ...params };
  let audio;

  const timer = new THREE.Timer();
  timer.connect(canvas.ownerDocument);

  const camera = new THREE.PerspectiveCamera(
    50,
    canvas.width / canvas.height,
    1,
    10000,
  );
  camera.position.set(0, 25, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.0025);

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(0, 0.5, 1).normalize();
  scene.add(light);

  const sphere = new THREE.SphereGeometry(20, 32, 16);

  const material1 = new THREE.MeshPhongMaterial({
    color: 0xffaa00,
    flatShading: true,
    shininess: 0,
  });
  const material2 = new THREE.MeshPhongMaterial({
    color: 0xff2200,
    flatShading: true,
    shininess: 0,
  });
  const material3 = new THREE.MeshPhongMaterial({
    color: 0x6622aa,
    flatShading: true,
    shininess: 0,
  });

  // sound spheres

  const mesh1 = new THREE.Mesh(sphere, material1);
  mesh1.position.set(-250, 30, 0);
  scene.add(mesh1);

  const mesh2 = new THREE.Mesh(sphere, material2);
  mesh2.position.set(250, 30, 0);
  scene.add(mesh2);

  const mesh3 = new THREE.Mesh(sphere, material3);
  mesh3.position.set(0, 30, -250);
  scene.add(mesh3);

  // ground

  const helper = new THREE.GridHelper(1000, 10, 0x444444, 0x444444);
  helper.position.y = 0.1;
  scene.add(helper);

  // The upstream start button becomes the first click on the canvas: the
  // scene renders at once, and audio starts only after that user gesture.
  function startAudio() {
    if (audio || typeof globalThis.AudioContext !== "function") return;

    // A fresh context per mount, because cleanup closes it.
    const context = new globalThis.AudioContext();
    THREE.AudioContext.setContext(context);

    const listener = new THREE.AudioListener();
    camera.add(listener);

    const track1 = createPulseTrack(context, SONG_TRACK);
    const sound1 = new THREE.PositionalAudio(listener);
    sound1.setNodeSource(track1.output);
    sound1.setRefDistance(20);
    mesh1.add(sound1);

    //

    const track2 = createPulseTrack(context, SKULLBEATZ_TRACK);
    const sound2 = new THREE.PositionalAudio(listener);
    sound2.setNodeSource(track2.output);
    sound2.setRefDistance(20);
    mesh2.add(sound2);

    //

    const sound3 = new THREE.PositionalAudio(listener);
    const oscillator = listener.context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(144, sound3.context.currentTime);
    oscillator.start(0);
    sound3.setNodeSource(oscillator);
    sound3.setRefDistance(20);
    sound3.setVolume(0.5);
    mesh3.add(sound3);

    // analysers

    const analyser1 = new THREE.AudioAnalyser(sound1, 32);
    const analyser2 = new THREE.AudioAnalyser(sound2, 32);
    const analyser3 = new THREE.AudioAnalyser(sound3, 32);

    // global ambient audio

    const track4 = createPulseTrack(context, UTOPIA_TRACK);
    const sound4 = new THREE.Audio(listener);
    sound4.setNodeSource(track4.output);
    sound4.setVolume(0.5);

    audio = {
      context,
      listener,
      sounds: [sound1, sound2, sound3, sound4],
      tracks: [track1, track2, track4],
      oscillator,
      analysers: [analyser1, analyser2, analyser3],
    };
    applySettings();
  }
  canvas.addEventListener("click", startAudio);

  function applySettings() {
    if (!audio) return;
    const { listener, sounds, oscillator, context } = audio;
    listener.setMasterVolume(Number(settings.master));
    sounds[0].setVolume(Number(settings.firstSphere));
    sounds[1].setVolume(Number(settings.secondSphere));
    sounds[2].setVolume(Number(settings.thirdSphere));
    sounds[3].setVolume(Number(settings.Ambient));
    oscillator.frequency.setValueAtTime(
      Number(settings.frequency),
      context.currentTime,
    );
    oscillator.type = settings.wavetype;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  //

  const controls = new FirstPersonControls(camera, renderer.domElement);

  controls.movementSpeed = 70;
  controls.lookSpeed = 0.2;
  controls.lookVertical = false;

  const materials = [material1, material2, material3];

  const animation = createExampleAnimationLoop((timestamp) => {
    timer.update(timestamp);

    const delta = timer.getDelta();

    controls.update(delta);

    if (audio) {
      for (let i = 0; i < 3; i++) {
        materials[i].emissive.b =
          audio.analysers[i].getAverageFrequency() / 256;
      }
    }

    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
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
        // Closing the context releases every remaining node.
        audio.context.close();
        THREE.AudioContext.setContext(undefined);
        audio = undefined;
      }
      timer.dispose();
      controls.dispose();
      sphere.dispose();
      for (const material of materials) material.dispose();
      helper.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };

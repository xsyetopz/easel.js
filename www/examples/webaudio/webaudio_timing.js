import {
  AmbientLight,
  AudioGraph,
  BoxGeometry,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webaudio_timing",
  name: "WebAudio Timing",
  category: "webaudio",
  description:
    "CPU animation schedules short WebAudio tones exactly when bouncing balls reverse direction.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const context = canvas.getContext("2d");
  if (!context) return;
  const graph = new AudioGraph();
  const scene = new Scene();
  scene.background = 0x101722;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(7, 3, 7);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.65));
  const geometry = new BoxGeometry(0.5, 0.5, 0.5);
  const objects = [0, 1, 2, 3, 4].map((index) => {
    const ball = new Mesh(
      geometry,
      new LambertMaterial({
        color: [0x4676b6, 0x59c5d6, 0xffaa00, 0xff5577, 0x9f8cff][index],
      }),
    );
    const angle = (index / 5) * Math.PI * 2;
    ball.position.x = Math.cos(angle) * 3;
    ball.position.z = Math.sin(angle) * 3;
    scene.add(ball);
    return { ball, down: false };
  });
  const timer = new Timer();
  let frame;
  function animate(timestamp) {
    frame = globalThis.requestAnimationFrame(animate);
    timer.update(timestamp);
    const time = timer.elapsedTime;
    objects.forEach(({ ball, down }, index) => {
      const previous = ball.position.y;
      ball.position.y = Math.abs(Math.sin(index * 0.5 + time * 2.5) * 3);
      if (ball.position.y < previous) {
        objects[index].down = true;
      } else if (down) {
        graph.playTone(220 + index * 70, 0.06, "sine");
        objects[index].down = false;
      }
    });
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    context.fillStyle = "#d5e7f2";
    context.font = "13px sans-serif";
    context.fillText?.("audio scheduled at each bounce", 12, 20);
  }
  void graph.resume();
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      graph.dispose();
      geometry.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const graph = new EASEL.AudioGraph();
if (ball.position.y < previousHeight) down = true;
else if (down) {
  graph.playTone(440, 0.08);
  down = false;
}`;

export const threeSource = `import * as THREE from "three";

const audioLoader = new THREE.AudioLoader();
const audio = new THREE.PositionalAudio(listener);
audio.setBuffer(buffer);
ball.add(audio);
if (ball.position.y < previousHeight) ball.userData.down = true;
else if (ball.userData.down) {
  audio.play();
  ball.userData.down = false;
}`;

export const example = { meta, controls, setup, easelSource, threeSource };

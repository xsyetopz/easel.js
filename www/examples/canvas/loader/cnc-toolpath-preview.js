import {
  GCodeLoader,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "cnc-toolpath-preview",
  name: "CNC Toolpath Preview",
  category: "data",
  description: "Review G-code layers and travel moves before machining.",
};
export const controls = [];

const source = `;LAYER:0
M82
G90
G0 X-1 Y-1 Z0 F3600
G1 X1 Y-1 E0.2 F1200
G1 X1 Y1 E0.4
G1 X-1 Y1 E0.6
G1 X-1 Y-1 E0.8
;LAYER:1
G0 Z0.5 F3600
G1 X-0.7 Y-0.7 E1.0 F1200
G1 X0.7 Y-0.7 E1.2
G1 X0.7 Y0.7 E1.4
G1 X-0.7 Y0.7 E1.6
G1 X-0.7 Y-0.7 E1.8`;

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x121826;
  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(3.6, 3.2, 5.2);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(0, 0, 0);
  orbit.minDistance = 2;
  orbit.maxDistance = 20;
  const loader = new GCodeLoader();
  loader.splitLayer = true;
  const model = loader.parse(source);
  scene.add(model);
  const timer = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = globalThis.requestAnimationFrame(animate);
    model.rotation.z += timer.update().delta * 0.12;
    orbit.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined)
        globalThis.cancelAnimationFrame(animationFrame);
      orbit.dispose();
      for (const child of model.children) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const loader = new EASEL.GCodeLoader();
loader.splitLayer = true;
const model = loader.parse(data);
scene.add(model);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};

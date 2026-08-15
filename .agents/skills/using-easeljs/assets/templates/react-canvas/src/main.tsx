import * as EASEL from "@xsyetopz/easel";
import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const renderer = new EASEL.Renderer({ width: 320, height: 180, canvas });
    const scene = new EASEL.Scene();
    const camera = new EASEL.PerspectiveCamera({
      fov: 60,
      aspect: 320 / 180,
      near: 0.1,
      far: 100,
    });
    camera.position.set(2, 2, 4);
    camera.updateMatrixWorld(false, false, true);
    camera.lookAt(0, 0, 0);
    camera.updateMatrix();
    const geometry = new EASEL.BoxGeometry(1, 1, 1);
    const material = new EASEL.BasicMaterial({ color: 0x66ccff });
    const cube = new EASEL.Mesh(geometry, material);
    scene.add(cube);
    let frameId = 0;
    function frame() {
      cube.rotation.y += 0.02;
      renderer.prepare(scene, camera);
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);
  return <canvas ref={ref} width={320} height={180} />;
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

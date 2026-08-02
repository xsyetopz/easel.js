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
		camera.lookAt(0, 0, 0);
		const cube = new EASEL.Mesh(
			new EASEL.BoxGeometry(1, 1, 1),
			new EASEL.BasicMaterial({ color: 0x66ccff }),
		);
		scene.add(cube);
		let frameId = 0;
		function frame() {
			cube.rotation.y += 0.02;
			renderer.render(scene, camera);
			frameId = requestAnimationFrame(frame);
		}
		frame();
		return () => {
			cancelAnimationFrame(frameId);
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

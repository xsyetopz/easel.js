import { Paper } from "@mantine/core";
import { useEffect, useRef } from "react";
import * as EASEL from "@/index.js";

/**
 * Live EASEL.js canvas showing a rotating torus knot for the hero section.
 */
export function HeroCanvas() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const width = 320;
		const height = 220;
		canvas.width = width;
		canvas.height = height;

		const scene = new EASEL.Scene();
		const camera = new EASEL.PerspectiveCamera({
			fov: 50,
			aspect: width / height,
			near: 0.1,
			far: 100,
		});
		camera.position.set(0, 1.5, 4);
		camera.lookAt(new EASEL.Vector3(0, 0, 0));

		const renderer = new EASEL.Renderer({ canvas, width, height });

		scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
		const light = new EASEL.DirectionalLight(0xffffff, 0.8);
		light.position.set(3, 5, 4);
		scene.add(light);

		const mesh = new EASEL.Mesh(
			new EASEL.TorusKnotGeometry(0.8, 0.25, 64, 12),
			new EASEL.LambertMaterial({ color: 0x5577dd }),
		);
		scene.add(mesh);

		let animId: number | undefined;
		const clock = new EASEL.Clock();

		function animate() {
			animId = requestAnimationFrame(animate);
			const dt = clock.delta;
			mesh.rotation.y += 0.4 * dt;
			mesh.rotation.x += 0.15 * dt;
			renderer.render(scene, camera);
		}
		animate();

		return () => {
			if (animId !== undefined) cancelAnimationFrame(animId);
		};
	}, []);

	return (
		<Paper radius="md" style={{ overflow: "hidden", lineHeight: 0 }}>
			<canvas
				ref={canvasRef}
				style={{ width: "100%", height: "auto", display: "block" }}
			/>
		</Paper>
	);
}

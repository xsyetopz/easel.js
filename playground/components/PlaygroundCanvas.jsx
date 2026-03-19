import { useEffect, useRef } from "react";
import { PlaygroundScene } from "../scenes/PlaygroundScene.js";

/**
 * @param {{
 *   activeZone: { setup: Function } | null,
 *   onControlsChange?: (controls: Array<object>) => void,
 *   params?: Record<string, unknown>,
 * }} props
 */
export function PlaygroundCanvas({ activeZone, onControlsChange, params }) {
	const containerRef = useRef(null);
	const sceneRef = useRef(null);
	// Stable ref so the zone-switch effect never needs onControlsChange as a dep.
	const onControlsChangeRef = useRef(onControlsChange);
	onControlsChangeRef.current = onControlsChange;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const canvas = document.createElement("canvas");
		const rect = container.getBoundingClientRect();
		canvas.width = Math.max(1, Math.floor(rect.width));
		canvas.height = Math.max(1, Math.floor(rect.height));
		container.appendChild(canvas);

		const scene = new PlaygroundScene(canvas);
		sceneRef.current = scene;
		scene.start();

		return () => {
			scene.dispose();
			if (container.contains(canvas)) {
				container.removeChild(canvas);
			}
			sceneRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (sceneRef.current && activeZone) {
			const controls = sceneRef.current.switchZone(activeZone);
			onControlsChangeRef.current?.(controls);
		}
	}, [activeZone]);

	useEffect(() => {
		if (sceneRef.current && params) {
			sceneRef.current.updateParams(params);
		}
	}, [params]);

	return (
		<div
			ref={containerRef}
			style={{ width: "100%", height: "100%", background: "#000" }}
		/>
	);
}

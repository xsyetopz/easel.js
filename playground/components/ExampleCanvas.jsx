import { Box } from "@mantine/core";
import { useEffect, useRef } from "react";

export function ExampleCanvas({ setup, params }) {
	const canvasRef = useRef(null);
	const instanceRef = useRef(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const container = canvas.parentElement;
		const width = container.clientWidth;
		const height = Math.max(400, container.clientHeight);
		canvas.width = width;
		canvas.height = height;

		instanceRef.current = setup(canvas, params);

		return () => {
			if (instanceRef.current?.cleanup) {
				instanceRef.current.cleanup();
			}
			instanceRef.current = null;
		};
	}, [setup, params]);

	useEffect(() => {
		if (instanceRef.current?.update && params) {
			instanceRef.current.update(params);
		}
	}, [params]);

	return (
		<Box
			style={{
				width: "100%",
				height: "100%",
				minHeight: 400,
				background: "#000",
				borderRadius: "var(--mantine-radius-sm)",
				overflow: "hidden",
			}}
		>
			<canvas
				ref={canvasRef}
				style={{ display: "block", width: "100%", height: "100%" }}
			/>
		</Box>
	);
}

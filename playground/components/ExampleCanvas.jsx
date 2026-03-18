import { Box } from "@mantine/core";
import { useEffect, useRef } from "react";

export function ExampleCanvas({ setup, params }) {
	const canvasRef = useRef(undefined);
	const instanceRef = useRef(undefined);
	const paramsRef = useRef(params);
	paramsRef.current = params;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const container = canvas.parentElement;
		const width = Math.max(300, container.clientWidth);
		const height = Math.max(400, container.clientHeight);
		canvas.width = width;
		canvas.height = height;

		instanceRef.current = setup(canvas, paramsRef.current);

		return () => {
			if (instanceRef.current?.cleanup) {
				instanceRef.current.cleanup();
			}
			instanceRef.current = undefined;
		};
	}, [setup]);

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
				style={{
					display: "block",
					width: "100%",
					height: "100%",
					imageRendering: "pixelated",
				}}
			/>
		</Box>
	);
}

import {
	BasicMaterial,
	BoxGeometry,
	CanvasTexture,
	Clock,
	Mesh,
	OrthographicCamera,
	Renderer,
	Scene,
} from "@/index.js";

export const controls = [
	{
		type: "select",
		key: "pattern",
		label: "Pattern",
		options: ["Checkerboard", "Gradient", "Stripes"],
		default: "Checkerboard",
	},
	{
		type: "slider",
		key: "cells",
		label: "Cells",
		min: 2,
		max: 16,
		step: 1,
		default: 4,
	},
];

const TEX_SIZE = 64;

function drawCheckerboard(ctx, cells, cellSize) {
	for (let row = 0; row < cells; row++) {
		for (let col = 0; col < cells; col++) {
			ctx.fillStyle = (row + col) % 2 === 0 ? "#000000" : "#ffffff";
			ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
		}
	}
}

function drawGradient(ctx, cells, cellSize) {
	for (let col = 0; col < cells; col++) {
		const hue = Math.round((col / cells) * 360);
		ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
		ctx.fillRect(col * cellSize, 0, cellSize, TEX_SIZE);
	}
}

function drawStripes(ctx, cells, cellSize) {
	for (let row = 0; row < cells; row++) {
		const hue = Math.round((row / cells) * 360);
		ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
		ctx.fillRect(0, row * cellSize, TEX_SIZE, cellSize);
	}
}

const patternDrawers = {
	Checkerboard: drawCheckerboard,
	Gradient: drawGradient,
	Stripes: drawStripes,
};

function drawPattern(ctx, pattern, cells) {
	const cellSize = TEX_SIZE / cells;
	ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
	const draw = patternDrawers[pattern] ?? drawCheckerboard;
	draw(ctx, cells, cellSize);
}

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 3;

	const scene = new Scene();
	const camera = new OrthographicCamera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 5;

	const renderer = new Renderer({ canvas, width, height });

	let currentPattern = params.pattern ?? "Checkerboard";
	let currentCells = params.cells ?? 4;

	const offscreen = document.createElement("canvas");
	offscreen.width = TEX_SIZE;
	offscreen.height = TEX_SIZE;
	const ctx = offscreen.getContext("2d");

	drawPattern(ctx, currentPattern, currentCells);
	let texture = new CanvasTexture(offscreen);

	const material = new BasicMaterial({ color: 0xffffff, map: texture });
	const box = new Mesh(new BoxGeometry(2.5, 2.5, 2.5), material);
	scene.add(box);

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		box.rotation.x += 0.3 * dt;
		box.rotation.y += 0.5 * dt;
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.pattern !== undefined) currentPattern = newParams.pattern;
			if (newParams.cells !== undefined) currentCells = newParams.cells;

			drawPattern(ctx, currentPattern, currentCells);
			texture = new CanvasTexture(offscreen);
			material.map = texture;
			material.needsUpdate = true;
		},
	};
}

export const source = `import {
  Scene, OrthographicCamera, Renderer, Clock,
  BoxGeometry, BasicMaterial, Mesh, CanvasTexture,
} from "easel";

// Draw a procedural pattern onto an offscreen canvas,
// then wrap it in CanvasTexture — no file loading required.

const offscreen = document.createElement("canvas");
offscreen.width = 64;
offscreen.height = 64;
const ctx = offscreen.getContext("2d");

// Checkerboard example
const cellSize = 64 / cells;
for (let row = 0; row < cells; row++) {
  for (let col = 0; col < cells; col++) {
    ctx.fillStyle = (row + col) % 2 === 0 ? "#000" : "#fff";
    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
  }
}

const texture = new CanvasTexture(offscreen); // needsUpdate set in constructor
const material = new BasicMaterial({ color: 0xffffff, map: texture });
const box = new Mesh(new BoxGeometry(2.5, 2.5, 2.5), material);
scene.add(box);`;

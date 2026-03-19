import * as EASEL from "@/index.js";

export const meta = {
	id: "canvas-texture",
	name: "Canvas Texture",
	category: "textures",
	description:
		"Procedural patterns drawn on an offscreen canvas and applied as a texture.",
};

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

/** @type {Record<string, (ctx: CanvasRenderingContext2D, cells: number, cellSize: number) => void>} */
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

	const scene = new EASEL.Scene();
	const camera = new EASEL.OrthographicCamera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 5;

	const renderer = new EASEL.Renderer({ canvas, width, height });

	let currentPattern = params.pattern ?? "Checkerboard";
	let currentCells = params.cells ?? 4;

	const offscreen = document.createElement("canvas");
	offscreen.width = TEX_SIZE;
	offscreen.height = TEX_SIZE;
	const ctx = offscreen.getContext("2d");

	drawPattern(ctx, currentPattern, currentCells);
	let texture = new EASEL.CanvasTexture(offscreen);

	const material = new EASEL.BasicMaterial({ color: 0xffffff, map: texture });
	const box = new EASEL.Mesh(new EASEL.BoxGeometry(2.5, 2.5, 2.5), material);
	scene.add(box);

	const clock = new EASEL.Clock();
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
			texture = new EASEL.CanvasTexture(offscreen);
			material.map = texture;
			material.needsUpdate = true;
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

// Draw a procedural pattern onto an offscreen canvas,
// then wrap it in EASEL.CanvasTexture - no file loading required.

const offscreen = document.createElement("canvas");
offscreen.width = 64;
offscreen.height = 64;
const ctx = offscreen.getContext("2d");

const cells = 4;
const cellSize = 64 / cells;
for (let row = 0; row < cells; row++) {
  for (let col = 0; col < cells; col++) {
    ctx.fillStyle = (row + col) % 2 === 0 ? "#000" : "#fff";
    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
  }
}

// CanvasTexture reads the canvas pixels immediately
const texture = new EASEL.CanvasTexture(offscreen);
const material = new EASEL.BasicMaterial({ color: 0xffffff, map: texture });
const box = new EASEL.Mesh(new EASEL.BoxGeometry(2.5, 2.5, 2.5), material);
scene.add(box);

// To update the texture at runtime, redraw the canvas and reassign:
// material.map = new EASEL.CanvasTexture(offscreen);
// material.needsUpdate = true;`;

export const threeSource = `import * as THREE from "three";

// THREE.CanvasTexture works the same way - same API.

const offscreen = document.createElement("canvas");
offscreen.width = 64;
offscreen.height = 64;
const ctx = offscreen.getContext("2d");

const cells = 4;
const cellSize = 64 / cells;
for (let row = 0; row < cells; row++) {
  for (let col = 0; col < cells; col++) {
    ctx.fillStyle = (row + col) % 2 === 0 ? "#000" : "#fff";
    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
  }
}

const texture = new THREE.CanvasTexture(offscreen);
const material = new THREE.MeshBasicMaterial({ map: texture });
const box = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), material);
scene.add(box);

// To update: set texture.needsUpdate = true after redrawing the canvas.`;

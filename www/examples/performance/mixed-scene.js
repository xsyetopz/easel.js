import * as EASEL from "@/index.js";

export const meta = {
	id: "mixed-scene",
	name: "Mixed Complexity Scene",
	category: "performance",
	description:
		"Heterogeneous scene with varied geometry, materials, and shading modes.",
};

export const controls = [
	{
		type: "slider",
		key: "complexity",
		label: "Complexity",
		min: 1,
		max: 5,
		step: 1,
		default: 3,
	},
	{
		type: "select",
		key: "fog",
		label: "Fog",
		options: ["Off", "On"],
		default: "Off",
	},
];

const COLORS = [0x5577dd, 0xe07050, 0x50c080, 0xd0a030, 0xb060d0, 0x60b0d0];

function createCheckerTexture() {
	const size = 32;
	const data = new Uint8ClampedArray(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			const checker = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
			const v = checker ? 220 : 60;
			data[i] = v;
			data[i + 1] = v;
			data[i + 2] = v;
			data[i + 3] = 255;
		}
	}
	return new EASEL.DataTexture(data, size, size);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new EASEL.Scene();
	const origin = new EASEL.Vector3(0, 0, 0);
	const camera = new EASEL.PerspectiveCamera({
		fov: 60,
		aspect: width / height,
		near: 0.1,
		far: 200,
	});

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.7);
	dirLight.position.set(5, 10, 7);
	scene.add(dirLight);

	const checkerTex = createCheckerTexture();

	let currentComplexity = /** @type {number} */ (params.complexity ?? 3);
	let currentFog = /** @type {string} */ (params.fog ?? "Off");

	/** @type {EASEL.Mesh[]} */
	let meshes = [];
	/** @type {EASEL.PointLight[]} */
	let extraLights = [];

	/**
	 * @param {number} level
	 */
	function buildScene(level) {
		for (const m of meshes) scene.remove(m);
		for (const l of extraLights) scene.remove(l);
		meshes = [];
		extraLights = [];

		// Ground plane
		const ground = new EASEL.Mesh(
			new EASEL.PlaneGeometry(30, 30),
			new EASEL.LambertMaterial({ color: 0x556644 }),
		);
		ground.rotation.x = -Math.PI / 2;
		ground.position.y = -0.5;
		scene.add(ground);
		meshes.push(ground);

		// Level 1: 4 cubes + 1 low-poly sphere
		if (level >= 1) {
			for (let i = 0; i < 4; i++) {
				const cube = new EASEL.Mesh(
					new EASEL.BoxGeometry(1, 1, 1),
					new EASEL.LambertMaterial({ color: COLORS[i] }),
				);
				cube.position.set((i - 1.5) * 2.5, 0.5, 0);
				scene.add(cube);
				meshes.push(cube);
			}
			const sphere = new EASEL.Mesh(
				new EASEL.SphereGeometry(0.8, 12, 8),
				new EASEL.LambertMaterial({ color: 0x5577dd }),
			);
			sphere.position.set(0, 0.8, 3);
			scene.add(sphere);
			meshes.push(sphere);
		}

		// Level 2: +8 cylinders + 2 torus knots
		if (level >= 2) {
			for (let i = 0; i < 8; i++) {
				const cyl = new EASEL.Mesh(
					new EASEL.CylinderGeometry(0.3, 0.3, 1.5, 12),
					new EASEL.LambertMaterial({
						color: COLORS[i % 6],
						shading: EASEL.Shading.Flat,
					}),
				);
				const angle = (i / 8) * Math.PI * 2;
				cyl.position.set(
					Math.cos(angle) * 5,
					0.75,
					Math.sin(angle) * 5,
				);
				scene.add(cyl);
				meshes.push(cyl);
			}
			for (let i = 0; i < 2; i++) {
				const tk = new EASEL.Mesh(
					new EASEL.TorusKnotGeometry(0.5, 0.15, 32, 8),
					new EASEL.LambertMaterial({ color: 0xdd8844 }),
				);
				tk.position.set(i * 4 - 2, 1.5, -4);
				scene.add(tk);
				meshes.push(tk);
			}
		}

		// Level 3: +20 textured cubes + 1 high-poly sphere + 1 wireframe cube
		if (level >= 3) {
			for (let i = 0; i < 20; i++) {
				const mat = new EASEL.LambertMaterial({ color: 0xffffff });
				mat.map = checkerTex;
				const cube = new EASEL.Mesh(
					new EASEL.BoxGeometry(0.6, 0.6, 0.6),
					mat,
				);
				cube.position.set(
					(Math.random() - 0.5) * 12,
					0.3 + Math.random() * 2,
					(Math.random() - 0.5) * 12,
				);
				scene.add(cube);
				meshes.push(cube);
			}
			const hiSphere = new EASEL.Mesh(
				new EASEL.SphereGeometry(1, 64, 48),
				new EASEL.LambertMaterial({ color: 0xaa44dd }),
			);
			hiSphere.position.set(0, 2, 0);
			scene.add(hiSphere);
			meshes.push(hiSphere);

			const wireMat = new EASEL.BasicMaterial({ color: 0x44aaff });
			wireMat.wireframe = true;
			const wireCube = new EASEL.Mesh(
				new EASEL.BoxGeometry(2, 2, 2),
				wireMat,
			);
			wireCube.position.set(6, 1, 0);
			scene.add(wireCube);
			meshes.push(wireCube);
		}

		// Level 4: +40 random mixed objects + 2 PointLights
		if (level >= 4) {
			const geos = [
				new EASEL.BoxGeometry(0.5, 0.5, 0.5),
				new EASEL.SphereGeometry(0.3, 16, 12),
				new EASEL.CylinderGeometry(0.2, 0.2, 0.8, 10),
				new EASEL.ConeGeometry(0.3, 0.7, 10),
			];
			for (let i = 0; i < 40; i++) {
				const geo = geos[i % geos.length];
				const mat = new EASEL.LambertMaterial({ color: COLORS[i % 6] });
				const obj = new EASEL.Mesh(geo, mat);
				obj.position.set(
					(Math.random() - 0.5) * 16,
					0.3 + Math.random() * 3,
					(Math.random() - 0.5) * 16,
				);
				scene.add(obj);
				meshes.push(obj);
			}

			const pl1 = new EASEL.PointLight(0xff4444, 1, 10);
			pl1.position.set(-5, 3, 0);
			scene.add(pl1);
			extraLights.push(pl1);

			const pl2 = new EASEL.PointLight(0x4444ff, 1, 10);
			pl2.position.set(5, 3, 0);
			scene.add(pl2);
			extraLights.push(pl2);
		}

		// Level 5: +100 random objects + 2 more PointLights + ToonMaterial objects
		if (level >= 5) {
			const geos = [
				new EASEL.BoxGeometry(0.4, 0.4, 0.4),
				new EASEL.SphereGeometry(0.25, 8, 6),
				new EASEL.TorusKnotGeometry(0.2, 0.06, 16, 6),
			];
			for (let i = 0; i < 80; i++) {
				const geo = geos[i % geos.length];
				const mat = new EASEL.LambertMaterial({ color: COLORS[i % 6] });
				const obj = new EASEL.Mesh(geo, mat);
				obj.position.set(
					(Math.random() - 0.5) * 20,
					0.2 + Math.random() * 4,
					(Math.random() - 0.5) * 20,
				);
				scene.add(obj);
				meshes.push(obj);
			}

			for (let i = 0; i < 20; i++) {
				const toon = new EASEL.Mesh(
					new EASEL.SphereGeometry(0.3, 12, 8),
					new EASEL.ToonMaterial({ color: COLORS[i % 6] }),
				);
				toon.position.set(
					(Math.random() - 0.5) * 14,
					0.3 + Math.random() * 2,
					(Math.random() - 0.5) * 14,
				);
				scene.add(toon);
				meshes.push(toon);
			}

			const pl3 = new EASEL.PointLight(0x44ff44, 1, 10);
			pl3.position.set(0, 4, -5);
			scene.add(pl3);
			extraLights.push(pl3);

			const pl4 = new EASEL.PointLight(0xffff44, 1, 10);
			pl4.position.set(0, 4, 5);
			scene.add(pl4);
			extraLights.push(pl4);
		}
	}

	/**
	 * @param {string} fogSetting
	 */
	function applyFog(fogSetting) {
		if (fogSetting === "On") {
			scene.fog = new EASEL.Fog({ color: 0x222222, near: 5, far: 30 });
		} else {
			scene.fog = null;
		}
	}

	buildScene(currentComplexity);
	applyFog(currentFog);

	const clock = new EASEL.Clock();
	let animId;
	let frames = 0;
	let fpsTime = 0;
	let fps = 0;
	let elapsed = 0;
	const ctx = canvas.getContext("2d");
	const timings = {};

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		elapsed += dt;

		camera.position.x = Math.sin(elapsed * 0.3) * 15;
		camera.position.z = Math.cos(elapsed * 0.3) * 15;
		camera.position.y = 8;
		camera.lookAt(origin);

		for (const mesh of meshes) {
			mesh.rotation.y += 0.3 * dt;
		}

		renderer.render(scene, camera, timings);

		frames++;
		fpsTime += dt;
		if (fpsTime >= 1) {
			fps = Math.round(frames / fpsTime);
			frames = 0;
			fpsTime = 0;
		}

		if (ctx) {
			ctx.fillStyle = "#fff";
			ctx.font = "14px monospace";
			ctx.fillText(
				`FPS: ${fps}  Meshes: ${meshes.length}  Complexity: ${currentComplexity}`,
				8,
				20,
			);
			const total = typeof timings.totalMs === "number"
				? timings.totalMs.toFixed(2)
				: "-";
			const trav = typeof timings.traversalMs === "number"
				? timings.traversalMs.toFixed(2)
				: "-";
			const sort = typeof timings.sortMs === "number"
				? timings.sortMs.toFixed(2)
				: "-";
			const shade = typeof timings.shadeRasterMs === "number"
				? timings.shadeRasterMs.toFixed(2)
				: "-";
			const upload = typeof timings.uploadMs === "number"
				? timings.uploadMs.toFixed(2)
				: "-";
			ctx.fillText(
				`ms: total ${total}  trav ${trav}  sort ${sort}  shade+rast ${shade}  upload ${upload}`,
				8,
				40,
			);
		}
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			let needsRebuild = false;
			if (
				newParams.complexity !== undefined &&
				newParams.complexity !== currentComplexity
			) {
				currentComplexity =
					/** @type {number} */ (newParams.complexity);
				needsRebuild = true;
			}
			if (newParams.fog !== undefined && newParams.fog !== currentFog) {
				currentFog = /** @type {string} */ (newParams.fog);
				applyFog(currentFog);
			}
			if (needsRebuild) {
				buildScene(currentComplexity);
				applyFog(currentFog);
			}
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 60, aspect: width / height, near: 0.1, far: 200,
});
const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.3));

const colors = [0x5577dd, 0xe07050, 0x50c080, 0xd0a030, 0xb060d0, 0x60b0d0];

const ground = new EASEL.Mesh(
  new EASEL.PlaneGeometry(30, 30),
  new EASEL.LambertMaterial({ color: 0x556644 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
scene.add(ground);

for (let i = 0; i < 4; i++) {
  const cube = new EASEL.Mesh(
    new EASEL.BoxGeometry(1, 1, 1),
    new EASEL.LambertMaterial({ color: colors[i] }),
  );
  cube.position.set((i - 1.5) * 2.5, 0.5, 0);
  scene.add(cube);
}
`;

export const noThreeReason =
	"This workload measures EASEL mixed primitive software-rendering cost.";

export const threeSource = undefined;

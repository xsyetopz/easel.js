import * as EASEL from "@/index.js";

export const controls = [
	{
		type: "slider",
		key: "separation",
		label: "Separation",
		min: 0,
		max: 3,
		step: 0.1,
		default: 0,
	},
	{
		type: "slider",
		key: "angle",
		label: "Angle",
		min: 0,
		max: 90,
		step: 1,
		default: 45,
	},
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 4;

	const scene = new EASEL.Scene();
	const camera = new EASEL.OrthographicCamera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 7;

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(3, 5, 4);
	scene.add(dirLight);

	const pivot = new EASEL.Group();
	scene.add(pivot);

	const planeA = new EASEL.Mesh(
		new EASEL.BoxGeometry(4, 4, 0.1),
		new EASEL.LambertMaterial({ color: 0xcc4444 }),
	);
	pivot.add(planeA);

	const planeB = new EASEL.Mesh(
		new EASEL.BoxGeometry(4, 4, 0.1),
		new EASEL.LambertMaterial({ color: 0x4444cc }),
	);
	planeB.position.z = params.separation ?? 0;
	planeB.rotation.x = ((params.angle ?? 45) * Math.PI) / 180;
	pivot.add(planeB);

	const clock = new EASEL.Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		pivot.rotation.y += 0.3 * dt;
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.separation !== undefined) {
				planeB.position.z = newParams.separation;
			}
			if (newParams.angle !== undefined) {
				planeB.rotation.x = (newParams.angle * Math.PI) / 180;
			}
		},
	};
}

export const source = `import {
  EASEL.Scene, EASEL.OrthographicCamera, EASEL.Renderer, EASEL.Clock,
  EASEL.AmbientLight, EASEL.DirectionalLight,
  EASEL.BoxGeometry, EASEL.LambertMaterial, EASEL.Mesh, EASEL.Group,
} from "easel";

// Painter's algorithm: faces sorted back-to-front by centroid depth.
// When two meshes geometrically intersect, one centroid is always
// behind the other - so one plane renders fully in front, which is wrong.
// No z-buffer means no per-pixel depth test to resolve the intersection.

const pivot = new EASEL.Group(); // both planes rotate together
scene.add(pivot);

const planeA = new EASEL.Mesh(
  new EASEL.BoxGeometry(4, 4, 0.1),
  new EASEL.LambertMaterial({ color: 0xcc4444 }),
);
pivot.add(planeA);

const planeB = new EASEL.Mesh(
  new EASEL.BoxGeometry(4, 4, 0.1),
  new EASEL.LambertMaterial({ color: 0x4444cc }),
);
planeB.rotation.x = Math.PI / 4; // angled through planeA
pivot.add(planeB);

function animate() {
  requestAnimationFrame(animate);
  pivot.rotation.y += 0.3 * clock.delta;
  renderer.render(scene, camera);
}`;

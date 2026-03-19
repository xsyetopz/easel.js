import * as EASEL from "@/index.js";

export const controls = [
	{
		type: "slider",
		key: "rotationSpeed",
		label: "Rotation Speed",
		min: 0,
		max: 3,
		step: 0.1,
		default: 1,
	},
	{
		type: "select",
		key: "bounce",
		label: "Bounce",
		options: ["None", "Vertical", "Horizontal"],
		default: "None",
	},
	{
		type: "slider",
		key: "scale",
		label: "Scale",
		min: 0.5,
		max: 2,
		step: 0.1,
		default: 1,
	},
];

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

	const material = new EASEL.BasicMaterial({ color: 0x4488cc });
	const box = new EASEL.Mesh(new EASEL.BoxGeometry(1.5, 1.5, 1.5), material);
	scene.add(box);

	let rotationSpeed = params.rotationSpeed ?? 1;
	let bounce = params.bounce ?? "None";
	let scale = params.scale ?? 1;

	const clock = new EASEL.Clock();
	let elapsed = 0;
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		elapsed += dt;

		box.rotation.y += rotationSpeed * dt;

		if (bounce === "Vertical") {
			box.position.y = Math.sin(elapsed * 2) * 1.5;
			box.position.x = 0;
		} else if (bounce === "Horizontal") {
			box.position.x = Math.sin(elapsed * 2) * 1.5;
			box.position.y = 0;
		} else {
			box.position.x = 0;
			box.position.y = 0;
		}

		box.scale.set(scale, scale, scale);

		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.rotationSpeed !== undefined) {
				rotationSpeed = newParams.rotationSpeed;
			}
			if (newParams.bounce !== undefined) bounce = newParams.bounce;
			if (newParams.scale !== undefined) scale = newParams.scale;
		},
	};
}

export const source = `import {
  EASEL.Scene, EASEL.OrthographicCamera, EASEL.Renderer, EASEL.Clock,
  EASEL.BoxGeometry, EASEL.BasicMaterial, EASEL.Mesh,
} from "easel";

const box = new EASEL.Mesh(
  new EASEL.BoxGeometry(1.5, 1.5, 1.5),
  new EASEL.BasicMaterial({ color: 0x4488cc }),
);
scene.add(box);

const clock = new EASEL.Clock();
let elapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.delta;
  elapsed += dt;

  // Rotation: scales with rotationSpeed param
  box.rotation.y += rotationSpeed * dt;

  // Bounce: sinusoidal position offset
  if (bounce === "Vertical") {
    box.position.y = Math.sin(elapsed * 2) * 1.5;
  } else if (bounce === "Horizontal") {
    box.position.x = Math.sin(elapsed * 2) * 1.5;
  }

  // Uniform scale
  box.scale.set(scale, scale, scale);

  renderer.render(scene, camera);
}
animate();`;

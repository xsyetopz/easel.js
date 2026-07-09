import * as EASEL from "@/index.js";

export const meta = {
	id: "group-transforms",
	name: "Group Transforms",
	category: "scene-graph",
	description:
		"Nested Groups compose transforms: outer rotates, inner scales, meshes inherit both.",
};

export const controls = [];

export function setup(canvas) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new EASEL.Scene();
	const camera = new EASEL.PerspectiveCamera({
		fov: 45,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.set(0, 4, 10);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(4, 6, 5);
	scene.add(dirLight);

	// Outer group rotates around Y - all children orbit with it
	const outerGroup = new EASEL.Group();
	scene.add(outerGroup);

	// Inner group scales - meshes inside get both the outer rotation and this scale
	const innerGroup = new EASEL.Group();
	outerGroup.add(innerGroup);

	const colors = [0xe05555, 0x55bb55, 0x5588e0, 0xddaa22];
	const offsets = [
		[-2, 0, 0],
		[2, 0, 0],
		[0, 0, -2],
		[0, 0, 2],
	];

	for (let i = 0; i < colors.length; i++) {
		const mesh = new EASEL.Mesh(
			new EASEL.BoxGeometry(0.8, 0.8, 0.8),
			new EASEL.LambertMaterial({ color: colors[i] }),
		);
		mesh.position.set(...offsets[i]);
		innerGroup.add(mesh);
	}

	// Center marker stays in outerGroup only - no inner scale
	const center = new EASEL.Mesh(
		new EASEL.SphereGeometry(0.2, 8, 6),
		new EASEL.BasicMaterial({ color: 0xffffff }),
	);
	outerGroup.add(center);

	const clock = new EASEL.Clock();
	let elapsed = 0;
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		elapsed += dt;

		outerGroup.rotation.y += 0.6 * dt;

		// Pulse the inner group scale so transform inheritance is obvious
		const s = 0.8 + 0.4 * Math.abs(Math.sin(elapsed * 1.2));
		innerGroup.scale.set(s, s, s);

		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const outerGroup = new EASEL.Group();
scene.add(outerGroup);

const innerGroup = new EASEL.Group();
outerGroup.add(innerGroup);

const mesh = new EASEL.Mesh(geometry, material);
mesh.position.set(2, 0, 0);
innerGroup.add(mesh);

outerGroup.rotation.y += 0.6 * dt;

const s = 0.8 + 0.4 * Math.abs(Math.sin(elapsed * 1.2));
innerGroup.scale.set(s, s, s);`;

export const threeSource = `import * as THREE from "three";

const outerGroup = new THREE.Group();
scene.add(outerGroup);

const innerGroup = new THREE.Group();
outerGroup.add(innerGroup);

const mesh = new THREE.Mesh(geometry, material);
mesh.position.set(2, 0, 0);
innerGroup.add(mesh);

outerGroup.rotation.y += 0.6 * dt;

const s = 0.8 + 0.4 * Math.abs(Math.sin(elapsed * 1.2));
innerGroup.scale.set(s, s, s);`;

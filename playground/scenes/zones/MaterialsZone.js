import {
	AmbientLight,
	BasicMaterial,
	BoxGeometry,
	DirectionalLight,
	LambertMaterial,
	Mesh,
	PlaneGeometry,
	Shading,
	SphereGeometry,
	TextureLoader,
	ToonMaterial,
	Vector3,
} from "@/index.js";

/**
 * Side-by-side comparison of BasicMaterial, LambertMaterial, and ToonMaterial
 * on identical geometry, with a textured box behind them and a ground plane.
 *
 * @param {import("@/index.js").Scene} scene
 * @param {import("@/index.js").PerspectiveCamera} camera
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera) {
	camera.position.set(0, 2, 10);
	camera.lookAt(new Vector3(0, 0, 0));

	const ambient = new AmbientLight(0xffffff, 0.3);
	scene.add(ambient);

	const dirLight = new DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(3, 5, 4);
	scene.add(dirLight);

	const sphereGeo = new SphereGeometry(1, 16, 12);

	const basicMat = new BasicMaterial({ color: 0xcc4444 });
	const lambertMat = new LambertMaterial({ color: 0x44cc44 });
	const toonMat = new ToonMaterial({ color: 0x4444cc });

	const leftSphere = new Mesh(sphereGeo, basicMat);
	leftSphere.position.set(-3, 0, 0);
	scene.add(leftSphere);

	const centerSphere = new Mesh(sphereGeo, lambertMat);
	centerSphere.position.set(0, 0, 0);
	scene.add(centerSphere);

	const rightSphere = new Mesh(sphereGeo, toonMat);
	rightSphere.position.set(3, 0, 0);
	scene.add(rightSphere);

	const boxMat = new BasicMaterial({ color: 0xffffff });
	const loader = new TextureLoader();
	loader.load("textures/Brick_01.png", (texture) => {
		boxMat.map = texture;
	});
	const box = new Mesh(new BoxGeometry(2, 2, 2), boxMat);
	box.position.set(0, 0, -3);
	scene.add(box);

	const groundMat = new LambertMaterial({ color: 0x888888 });
	const ground = new Mesh(new PlaneGeometry(14, 14), groundMat);
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -1.2;
	scene.add(ground);

	/** @type {Array<Mesh>} */
	const allMeshes = [leftSphere, centerSphere, rightSphere, box, ground];

	/** @type {Array<import("@/index.js").Material>} */
	const shadedMaterials = [lambertMat, toonMat];

	return {
		controls: [
			{
				type: "select",
				key: "shading",
				label: "Shading",
				options: ["Gouraud", "Flat"],
				default: "Gouraud",
			},
			{
				type: "slider",
				key: "opacity",
				label: "Opacity",
				min: 0,
				max: 8,
				step: 1,
				default: 8,
			},
		],

		animate(dt) {
			for (const mesh of allMeshes) {
				mesh.rotation.y += 0.5 * dt;
			}
		},

		update(params) {
			if (params.shading !== undefined) {
				const mode = params.shading === "Flat" ? Shading.Flat : Shading.Gouraud;
				for (const mat of shadedMaterials) {
					mat.shading = mode;
				}
			}
			if (params.opacity !== undefined) {
				const opacity = Number(params.opacity);
				for (const mat of [basicMat, lambertMat, toonMat, boxMat, groundMat]) {
					mat.opacity = opacity;
				}
			}
		},

		dispose() {
			// scene cleanup is handled by PlaygroundScene.switchZone
		},
	};
}

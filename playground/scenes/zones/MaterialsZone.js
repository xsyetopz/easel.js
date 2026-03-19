import * as EASEL from "@/index.js";

/**
 * Side-by-side comparison of BasicMaterial, LambertMaterial, and ToonMaterial
 * on identical geometry, with a textured box behind them and a ground plane.
 *
 * @param {EASEL.Scene} scene
 * @param {EASEL.PerspectiveCamera} camera
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera) {
	camera.position.set(0, 2, 10);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const ambient = new EASEL.AmbientLight(0xffffff, 0.3);
	scene.add(ambient);

	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(3, 5, 4);
	scene.add(dirLight);

	const sphereGeo = new EASEL.SphereGeometry(1, 16, 12);

	const basicMat = new EASEL.BasicMaterial({ color: 0xcc4444 });
	const lambertMat = new EASEL.LambertMaterial({ color: 0x44cc44 });
	const toonMat = new EASEL.ToonMaterial({ color: 0x4444cc });

	const leftSphere = new EASEL.Mesh(sphereGeo, basicMat);
	leftSphere.position.set(-3, 0, 0);
	scene.add(leftSphere);

	const centerSphere = new EASEL.Mesh(sphereGeo, lambertMat);
	centerSphere.position.set(0, 0, 0);
	scene.add(centerSphere);

	const rightSphere = new EASEL.Mesh(sphereGeo, toonMat);
	rightSphere.position.set(3, 0, 0);
	scene.add(rightSphere);

	const boxMat = new EASEL.BasicMaterial({ color: 0xffffff });
	const loader = new EASEL.TextureLoader();
	loader.load("textures/Brick_01.png", (texture) => {
		boxMat.map = texture;
	});
	const box = new EASEL.Mesh(new EASEL.BoxGeometry(2, 2, 2), boxMat);
	box.position.set(0, 0, -3);
	scene.add(box);

	const groundMat = new EASEL.LambertMaterial({ color: 0x888888 });
	const ground = new EASEL.Mesh(new EASEL.PlaneGeometry(14, 14), groundMat);
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -1.2;
	scene.add(ground);

	/** @type {Array<EASEL.Mesh>} */
	const allMeshes = [leftSphere, centerSphere, rightSphere, box, ground];

	/** @type {Array<EASEL.Material>} */
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
				const mode =
					params.shading === "Flat"
						? EASEL.Shading.Flat
						: EASEL.Shading.Gouraud;
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

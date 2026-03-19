import {
	AmbientLight,
	DirectionalLight,
	HemisphereLight,
	LambertMaterial,
	Mesh,
	PlaneGeometry,
	PointLight,
	SphereGeometry,
	SpotLight,
	Vector3,
} from "@/index.js";

/**
 * Interactive showcase of all 5 light types with controls for type, intensity,
 * and color. One active light at a time, swapped via update().
 *
 * @param {import("@/index.js").Scene} scene
 * @param {import("@/index.js").PerspectiveCamera} camera
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera) {
	camera.position.set(0, 2, 8);
	camera.lookAt(new Vector3(0, 0, 0));

	const baseAmbient = new AmbientLight(0xffffff, 0.1);
	scene.add(baseAmbient);

	const sphereMat = new LambertMaterial({ color: 0xcccccc });
	const sphere = new Mesh(new SphereGeometry(1.5, 16, 12), sphereMat);
	scene.add(sphere);

	const groundMat = new LambertMaterial({ color: 0x888888 });
	const ground = new Mesh(new PlaneGeometry(14, 14), groundMat);
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -2;
	scene.add(ground);

	/** @type {import("@/index.js").Light|null} */
	let activeLight = null;

	/**
	 * Build a light from the current params and add it to the scene.
	 *
	 * @param {{ lightType: string, intensity: number, lightColor: string }} params
	 */
	function applyLight(params) {
		if (activeLight !== null) {
			scene.remove(activeLight);
			activeLight = null;
		}

		const colorInt = Number.parseInt(params.lightColor.replace("#", ""), 16);
		const intensity = Number(params.intensity);

		switch (params.lightType) {
			case "Point": {
				const light = new PointLight(colorInt, intensity, 20, 2);
				light.position.set(2, 3, 2);
				activeLight = light;
				break;
			}
			case "Spot": {
				const light = new SpotLight(
					colorInt,
					intensity,
					20,
					Math.PI / 6,
					0.5,
					2,
				);
				light.position.set(2, 4, 2);
				activeLight = light;
				break;
			}
			case "Hemisphere": {
				// Hemisphere uses sky/ground colors; intensity from slider, color ignored
				activeLight = new HemisphereLight(0x8888ff, 0x443322, intensity);
				break;
			}
			case "Ambient": {
				activeLight = new AmbientLight(colorInt, intensity);
				break;
			}
			default: {
				// "Directional" and any unrecognised value
				const light = new DirectionalLight(colorInt, intensity);
				light.position.set(3, 5, 4);
				activeLight = light;
				break;
			}
		}

		scene.add(activeLight);
	}

	// Seed with default state matching control defaults
	applyLight({ lightType: "Directional", intensity: 1, lightColor: "#ffffff" });

	return {
		controls: [
			{
				type: "select",
				key: "lightType",
				label: "Light Type",
				options: ["Directional", "Point", "Spot", "Hemisphere", "Ambient"],
				default: "Directional",
			},
			{
				type: "slider",
				key: "intensity",
				label: "Intensity",
				min: 0,
				max: 2,
				step: 0.1,
				default: 1,
			},
			{
				type: "color",
				key: "lightColor",
				label: "Light Color",
				default: "#ffffff",
			},
		],

		animate(dt) {
			sphere.rotation.y += 0.5 * dt;
		},

		update(params) {
			// Merge with sensible fallbacks so partial updates still work
			const lightType =
				typeof params.lightType === "string" ? params.lightType : "Directional";
			const intensity =
				params.intensity === undefined ? 1 : Number(params.intensity);
			const lightColor =
				typeof params.lightColor === "string" ? params.lightColor : "#ffffff";

			applyLight({ lightType, intensity, lightColor });
		},

		dispose() {
			// scene cleanup is handled by PlaygroundScene.switchZone
		},
	};
}

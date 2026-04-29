import * as EASEL from "@/index.js";

export const meta = {
	id: "perf-scene-hierarchy",
	name: "Scene Hierarchy Depth",
	category: "performance",
	description: "Deep nested scene graph to test matrix propagation cost.",
};

export const controls = [
	{
		type: "slider",
		key: "depth",
		label: "Depth",
		min: 1,
		max: 15,
		step: 1,
		default: 8,
	},
	{
		type: "slider",
		key: "branches",
		label: "Branches",
		min: 1,
		max: 3,
		step: 1,
		default: 2,
	},
	{
		type: "select",
		key: "profileTraversal",
		label: "Traversal Profile",
		options: ["Off", "On"],
		default: "Off",
	},
];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new EASEL.Scene();
	const camera = new EASEL.PerspectiveCamera({
		fov: 60,
		aspect: width / height,
		near: 0.1,
		far: 200,
	});
	camera.position.set(0, 8, 20);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const light = new EASEL.DirectionalLight(0xffffff, 0.8);
	light.position.set(5, 10, 7);
	scene.add(light);

	const leafGeometry = new EASEL.BoxGeometry(0.3, 0.3, 0.3);
	const colors = [0x5577dd, 0xe07050, 0x50c080, 0xd0a030, 0xb060d0, 0x60b0d0];

	let currentDepth = params.depth ?? 8;
	let currentBranches = params.branches ?? 2;
	let currentProfileTraversal = params.profileTraversal ?? "Off";

	/** @type {EASEL.Group} */
	let root = new EASEL.Group();
	/** @type {{ group: EASEL.Group, level: number }[]} */
	let groups = [];
	let meshCount = 0;

	/**
	 * @param {EASEL.Group} parent
	 * @param {number} level
	 * @param {number} maxDepth
	 * @param {number} branchCount
	 */
	function buildTree(parent, level, maxDepth, branchCount) {
		if (level >= maxDepth) {
			const mesh = new EASEL.Mesh(
				leafGeometry,
				new EASEL.LambertMaterial({
					color: colors[meshCount % colors.length],
				}),
			);
			parent.add(mesh);
			meshCount++;
			return;
		}

		const spread = 2.0 / (level + 1);
		for (let i = 0; i < branchCount; i++) {
			const group = new EASEL.Group();
			group.position.x = (i - (branchCount - 1) / 2) * spread;
			group.scale.set(0.8, 0.8, 0.8);
			parent.add(group);
			groups.push({ group, level });
			buildTree(group, level + 1, maxDepth, branchCount);
		}
	}

	function rebuild(depth, branchCount) {
		scene.remove(root);
		root = new EASEL.Group();
		groups = [];
		meshCount = 0;
		buildTree(root, 0, depth, branchCount);
		scene.add(root);
	}

	rebuild(currentDepth, currentBranches);

	const clock = new EASEL.Clock();
	let animId;
	let frames = 0;
	let fpsTime = 0;
	let fps = 0;
	const ctx = canvas.getContext("2d");
	const timings = {};

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;

		for (const { group, level } of groups) {
			group.rotation.y += 0.5 * (level + 1) * dt;
		}

		timings.profileTraversal = currentProfileTraversal === "On";
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
				`FPS: ${fps}  Depth: ${currentDepth}  Meshes: ${meshCount}`,
				8,
				20,
			);
			const total =
				typeof timings.totalMs === "number" ? timings.totalMs.toFixed(2) : "—";
			const trav =
				typeof timings.traversalMs === "number"
					? timings.traversalMs.toFixed(2)
					: "—";
			const sort =
				typeof timings.sortMs === "number" ? timings.sortMs.toFixed(2) : "—";
			const shade =
				typeof timings.shadeRasterMs === "number"
					? timings.shadeRasterMs.toFixed(2)
					: "—";
			const upload =
				typeof timings.uploadMs === "number"
					? timings.uploadMs.toFixed(2)
					: "—";
			ctx.fillText(
				`ms: total ${total}  trav ${trav}  sort ${sort}  shade+rast ${shade}  upload ${upload}`,
				8,
				40,
			);
			if (timings.profileTraversal) {
				const uw =
					typeof timings.travUpdateWorldMs === "number"
						? timings.travUpdateWorldMs.toFixed(2)
						: "—";
				const walk =
					typeof timings.travWalkMs === "number"
						? timings.travWalkMs.toFixed(2)
						: "—";
				const proj =
					typeof timings.travProjectMs === "number"
						? timings.travProjectMs.toFixed(2)
						: "—";
				const asm =
					typeof timings.travAssembleMs === "number"
						? timings.travAssembleMs.toFixed(2)
						: "—";
				const dcs =
					typeof timings.travDrawCalls === "number"
						? timings.travDrawCalls
						: "—";
				ctx.fillText(
					`trav: updateWorld ${uw}  walk ${walk}  project ${proj}  assemble ${asm}  dcs ${dcs}`,
					8,
					60,
				);
			}
		}
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			let needsRebuild = false;
			if (newParams.depth !== undefined && newParams.depth !== currentDepth) {
				currentDepth = newParams.depth;
				needsRebuild = true;
			}
			if (
				newParams.branches !== undefined &&
				newParams.branches !== currentBranches
			) {
				currentBranches = newParams.branches;
				needsRebuild = true;
			}
			if (
				newParams.profileTraversal !== undefined &&
				newParams.profileTraversal !== currentProfileTraversal
			) {
				currentProfileTraversal = newParams.profileTraversal;
			}
			if (needsRebuild) {
				rebuild(currentDepth, currentBranches);
			}
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 60, aspect: width / height, near: 0.1, far: 200,
});
camera.position.set(0, 8, 20);

const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.4));

const leafGeo = new EASEL.BoxGeometry(0.3, 0.3, 0.3);

function buildTree(parent, level, maxDepth, branches) {
  if (level >= maxDepth) {
    parent.add(new EASEL.Mesh(leafGeo, new EASEL.LambertMaterial({ color: 0x5577dd })));
    return;
  }
  for (let i = 0; i < branches; i++) {
    const group = new EASEL.Group();
    group.position.x = (i - (branches - 1) / 2) * 2 / (level + 1);
    group.scale.set(0.8, 0.8, 0.8);
    parent.add(group);
    buildTree(group, level + 1, maxDepth, branches);
  }
}

const root = new EASEL.Group();
buildTree(root, 0, 8, 2);
scene.add(root);`;

export const noThreeReason =
	"This performance demo targets EASEL scene traversal overhead.";

export const threeSource = undefined;
